import {
  List as ImmutableList,
  Map as ImmutableMap,
} from 'immutable';
import IntlMessageFormat from 'intl-messageformat';
import 'intl-pluralrules';
import { defineMessages } from 'react-intl';

import api, { getLinks } from 'soapbox/api';
import { getFilters, regexFromFilters } from 'soapbox/selectors';
import { isLoggedIn } from 'soapbox/utils/auth';
import { parseVersion, PLEROMA } from 'soapbox/utils/features';
import { unescapeHTML } from 'soapbox/utils/html';
import { joinPublicPath } from 'soapbox/utils/static';

import { fetchRelationships } from './accounts';
import {
  importFetchedAccount,
  importFetchedAccounts,
  importFetchedStatus,
  importFetchedStatuses,
} from './importer';
import { saveMarker } from './markers';
import { getSettings, saveSettings } from './settings';

import type { AxiosError } from 'axios';
import type { AppDispatch, RootState } from 'soapbox/store';
import type { APIEntity } from 'soapbox/types/entities';

const NOTIFICATIONS_UPDATE      = 'NOTIFICATIONS_UPDATE';
const NOTIFICATIONS_UPDATE_NOOP = 'NOTIFICATIONS_UPDATE_NOOP';
const NOTIFICATIONS_UPDATE_QUEUE = 'NOTIFICATIONS_UPDATE_QUEUE';
const NOTIFICATIONS_DEQUEUE      = 'NOTIFICATIONS_DEQUEUE';

const NOTIFICATIONS_EXPAND_REQUEST = 'NOTIFICATIONS_EXPAND_REQUEST';
const NOTIFICATIONS_EXPAND_SUCCESS = 'NOTIFICATIONS_EXPAND_SUCCESS';
const NOTIFICATIONS_EXPAND_FAIL    = 'NOTIFICATIONS_EXPAND_FAIL';

const NOTIFICATIONS_FILTER_SET = 'NOTIFICATIONS_FILTER_SET';

const NOTIFICATIONS_CLEAR      = 'NOTIFICATIONS_CLEAR';
const NOTIFICATIONS_SCROLL_TOP = 'NOTIFICATIONS_SCROLL_TOP';

const NOTIFICATIONS_MARK_READ_REQUEST = 'NOTIFICATIONS_MARK_READ_REQUEST';
const NOTIFICATIONS_MARK_READ_SUCCESS = 'NOTIFICATIONS_MARK_READ_SUCCESS';
const NOTIFICATIONS_MARK_READ_FAIL    = 'NOTIFICATIONS_MARK_READ_FAIL';

const MAX_QUEUED_NOTIFICATIONS = 40;

defineMessages({
  mention: { id: 'notification.mention', defaultMessage: '{name} mentioned you' },
  group: { id: 'notifications.group', defaultMessage: '{count} notifications' },
});

const fetchRelatedRelationships = (dispatch: AppDispatch, notifications: APIEntity[]) => {
  const accountIds = notifications.filter(item => item.type === 'follow').map(item => item.account.id);

  if (accountIds.length > 0) {
    dispatch(fetchRelationships(accountIds));
  }
};

const updateNotifications = (notification: APIEntity) =>
  (dispatch: AppDispatch, getState: () => RootState) => {
    const showInColumn = getSettings(getState()).getIn(['notifications', 'shows', notification.type], true);

    if (notification.account) {
      dispatch(importFetchedAccount(notification.account));
    }

    // Used by Move notification
    if (notification.target) {
      dispatch(importFetchedAccount(notification.target));
    }

    if (notification.status) {
      dispatch(importFetchedStatus(notification.status));
    }

    if (showInColumn) {
      dispatch({
        type: NOTIFICATIONS_UPDATE,
        notification,
      });

      fetchRelatedRelationships(dispatch, [notification]);
    }
  };

const updateNotificationsQueue = (notification: APIEntity, intlMessages: Record<string, string>, intlLocale: string, curPath: string) =>
  (dispatch: AppDispatch, getState: () => RootState) => {
    if (notification.type === 'pleroma:chat_mention') return; // Drop chat notifications, handle them per-chat

    const showAlert = getSettings(getState()).getIn(['notifications', 'alerts', notification.type]);
    const filters = getFilters(getState(), { contextType: 'notifications' });
    const playSound = getSettings(getState()).getIn(['notifications', 'sounds', notification.type]);

    let filtered: boolean | null = false;

    const isOnNotificationsPage = curPath === '/notifications';

    if (['mention', 'status'].includes(notification.type)) {
      const regex = regexFromFilters(filters);
      const searchIndex = notification.status.spoiler_text + '\n' + unescapeHTML(notification.status.content);
      filtered = regex && regex.test(searchIndex);
    }

    // Desktop notifications
    try {
      if (showAlert && !filtered) {
        const title = new IntlMessageFormat(intlMessages[`notification.${notification.type}`], intlLocale).format({ name: notification.account.display_name.length > 0 ? notification.account.display_name : notification.account.username });
        const body = (notification.status && notification.status.spoiler_text.length > 0) ? notification.status.spoiler_text : unescapeHTML(notification.status ? notification.status.content : '');

        navigator.serviceWorker.ready.then(serviceWorkerRegistration => {
          serviceWorkerRegistration.showNotification(title, {
            body,
            icon: notification.account.avatar,
            tag: notification.id,
            data: {
              url: joinPublicPath('/notifications'),
            },
          }).catch(console.error);
        }).catch(console.error);
      }
    } catch (e) {
      console.warn(e);
    }

    if (playSound && !filtered) {
      dispatch({
        type: NOTIFICATIONS_UPDATE_NOOP,
        meta: { sound: 'boop' },
      });
    }

    if (isOnNotificationsPage) {
      dispatch({
        type: NOTIFICATIONS_UPDATE_QUEUE,
        notification,
        intlMessages,
        intlLocale,
      });
    } else {
      dispatch(updateNotifications(notification));
    }
  };

const dequeueNotifications = () =>
  (dispatch: AppDispatch, getState: () => RootState) => {
    const queuedNotifications = getState().notifications.get('queuedNotifications');
    const totalQueuedNotificationsCount = getState().notifications.get('totalQueuedNotificationsCount');

    if (totalQueuedNotificationsCount === 0) {
      return;
    } else if (totalQueuedNotificationsCount > 0 && totalQueuedNotificationsCount <= MAX_QUEUED_NOTIFICATIONS) {
      queuedNotifications.forEach((block: APIEntity) => {
        dispatch(updateNotifications(block.notification));
      });
    } else {
      dispatch(expandNotifications());
    }

    dispatch({
      type: NOTIFICATIONS_DEQUEUE,
    });
    dispatch(markReadNotifications());
  };

const excludeTypesFromSettings = (getState: () => RootState) => (getSettings(getState()).getIn(['notifications', 'shows']) as ImmutableMap<string, boolean>).filter(enabled => !enabled).keySeq().toJS();

const excludeTypesFromFilter = (filter: string) => {
  const allTypes = ImmutableList(['follow', 'follow_request', 'favourite', 'reblog', 'mention', 'status', 'poll', 'move', 'pleroma:emoji_reaction']);
  return allTypes.filterNot(item => item === filter).toJS();
};

const noOp = () => {};

const expandNotifications = ({ maxId }: Record<string, any> = {}, done = noOp) =>
  (dispatch: AppDispatch, getState: () => RootState) => {
    if (!isLoggedIn(getState)) return dispatch(noOp);

    const activeFilter = getSettings(getState()).getIn(['notifications', 'quickFilter', 'active']) as string;
    const notifications = getState().notifications;
    const isLoadingMore = !!maxId;

    if (notifications.get('isLoading')) {
      done();
      return dispatch(noOp);
    }

    const params: Record<string, any> = {
      max_id: maxId,
      exclude_types: activeFilter === 'all'
        ? excludeTypesFromSettings(getState)
        : excludeTypesFromFilter(activeFilter),
    };

    if (!maxId && notifications.get('items').size > 0) {
      params.since_id = notifications.getIn(['items', 0, 'id']);
    }

    dispatch(expandNotificationsRequest(isLoadingMore));

    return api(getState).get('/api/v1/notifications', { params }).then(response => {
      const next = getLinks(response).refs.find(link => link.rel === 'next');

      const entries = (response.data as APIEntity[]).reduce((acc, item) => {
        if (item.account?.id) {
          acc.accounts[item.account.id] = item.account;
        }

        // Used by Move notification
        if (item.target?.id) {
          acc.accounts[item.target.id] = item.target;
        }

        if (item.status?.id) {
          acc.statuses[item.status.id] = item.status;
        }

        return acc;
      }, { accounts: {}, statuses: {} });

      dispatch(importFetchedAccounts(Object.values(entries.accounts)));
      dispatch(importFetchedStatuses(Object.values(entries.statuses)));

      dispatch(expandNotificationsSuccess(response.data, next ? next.uri : null, isLoadingMore));
      fetchRelatedRelationships(dispatch, response.data);
      done();
    }).catch(error => {
      dispatch(expandNotificationsFail(error, isLoadingMore));
      done();
    });
  };

const expandNotificationsRequest = (isLoadingMore: boolean) => ({
  type: NOTIFICATIONS_EXPAND_REQUEST,
  skipLoading: !isLoadingMore,
});

const expandNotificationsSuccess = (notifications: APIEntity[], next: string | null, isLoadingMore: boolean) => ({
  type: NOTIFICATIONS_EXPAND_SUCCESS,
  notifications,
  next,
  skipLoading: !isLoadingMore,
});

const expandNotificationsFail = (error: AxiosError, isLoadingMore: boolean) => ({
  type: NOTIFICATIONS_EXPAND_FAIL,
  error,
  skipLoading: !isLoadingMore,
});

const clearNotifications = () =>
  (dispatch: AppDispatch, getState: () => RootState) => {
    if (!isLoggedIn(getState)) return;

    dispatch({
      type: NOTIFICATIONS_CLEAR,
    });

    api(getState).post('/api/v1/notifications/clear');
  };

const scrollTopNotifications = (top: boolean) =>
  (dispatch: AppDispatch) => {
    dispatch({
      type: NOTIFICATIONS_SCROLL_TOP,
      top,
    });
    dispatch(markReadNotifications());
  };

const setFilter = (filterType: string) =>
  (dispatch: AppDispatch) => {
    dispatch({
      type: NOTIFICATIONS_FILTER_SET,
      path: ['notifications', 'quickFilter', 'active'],
      value: filterType,
    });
    dispatch(expandNotifications());
    dispatch(saveSettings());
  };

// Of course Markers don't work properly in Pleroma.
// https://git.pleroma.social/pleroma/pleroma/-/issues/2769
const markReadPleroma = (max_id: string | number) =>
  (dispatch: AppDispatch, getState: () => RootState) => {
    return api(getState).post('/api/v1/pleroma/notifications/read', { max_id });
  };

const markReadNotifications = () =>
  (dispatch: AppDispatch, getState: () => RootState) => {
    if (!isLoggedIn(getState)) return;

    const state = getState();
    const instance = state.instance;
    const topNotificationId = state.notifications.get('items').first(ImmutableMap()).get('id');
    const lastReadId = state.notifications.get('lastRead');
    const v = parseVersion(instance.version);

    if (!(topNotificationId && topNotificationId > lastReadId)) return;

    const marker = {
      notifications: {
        last_read_id: topNotificationId,
      },
    };

    dispatch(saveMarker(marker));

    if (v.software === PLEROMA) {
      dispatch(markReadPleroma(topNotificationId));
    }
  };

export {
  NOTIFICATIONS_UPDATE,
  NOTIFICATIONS_UPDATE_NOOP,
  NOTIFICATIONS_UPDATE_QUEUE,
  NOTIFICATIONS_DEQUEUE,
  NOTIFICATIONS_EXPAND_REQUEST,
  NOTIFICATIONS_EXPAND_SUCCESS,
  NOTIFICATIONS_EXPAND_FAIL,
  NOTIFICATIONS_FILTER_SET,
  NOTIFICATIONS_CLEAR,
  NOTIFICATIONS_SCROLL_TOP,
  NOTIFICATIONS_MARK_READ_REQUEST,
  NOTIFICATIONS_MARK_READ_SUCCESS,
  NOTIFICATIONS_MARK_READ_FAIL,
  MAX_QUEUED_NOTIFICATIONS,
  updateNotifications,
  updateNotificationsQueue,
  dequeueNotifications,
  expandNotifications,
  expandNotificationsRequest,
  expandNotificationsSuccess,
  expandNotificationsFail,
  clearNotifications,
  scrollTopNotifications,
  setFilter,
  markReadPleroma,
  markReadNotifications,
};