import React from 'react';
import PropTypes from 'prop-types';
import { defineMessages, injectIntl } from 'react-intl';
import classNames from 'classnames';

const messages = defineMessages({
  collapse: { id: 'accordion.collapse', defaultMessage: 'Collapse' },
  expand: { id: 'accordion.expand', defaultMessage: 'Expand' },
});

export default @injectIntl class Accordion extends React.PureComponent {

  static propTypes = {
    headline: PropTypes.string.isRequired,
    content: PropTypes.oneOfType([PropTypes.string, PropTypes.element]),
    expanded: PropTypes.bool,
    onToggle: PropTypes.func,
    intl: PropTypes.object.isRequired,
  };

  static defaultProps = {
    expanded: false,
    onToggle: () => {},
  }

  handleToggle = (e) => {
    this.props.onToggle(!this.props.expanded);
    e.preventDefault();
  }

  render() {
    const { headline, content, expanded, intl } = this.props;

    return (
      <div className={classNames('accordion', { 'accordion--expanded' : expanded })}>
        <button
          type='button'
          className='accordion__title'
          onClick={this.handleToggle}
          title={intl.formatMessage(expanded ? messages.collapse : messages.expand)}
        >
          {headline}
        </button>
        <div className='accordion__content'>
          {content}
        </div>
      </div>
    );
  }

}