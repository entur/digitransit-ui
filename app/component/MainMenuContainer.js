import React, { Component, PropTypes } from 'react';

import config from '../config';
import Icon from './Icon';
import { openFeedbackModal } from '../action/feedbackActions';
import LazilyLoad, { importLazy } from './LazilyLoad';


class MainMenuContainer extends Component {
  static contextTypes = {
    executeAction: PropTypes.func.isRequired,
    location: PropTypes.object.isRequired,
    piwik: PropTypes.object,
    router: PropTypes.object.isRequired,
  };

  onRequestChange = newState => this.internalSetOffcanvas(newState);

  getOffcanvasState = () => {
    if (this.context.location.state != null &&
        this.context.location.state.offcanvasVisible != null) {
      return this.context.location.state.offcanvasVisible;
    }
    // If the state is missing or doesn't have offcanvasVisible, it's not set
    return false;
  }

  toggleOffcanvas = () => this.internalSetOffcanvas(!this.getOffcanvasState());

  internalSetOffcanvas = (newState) => {
    if (this.context.piwik != null) {
      this.context.piwik.trackEvent('Offcanvas', 'Index', newState ? 'open' : 'close');
    }

    if (newState) {
      this.context.router.push({
        state: { offcanvasVisible: newState },
        pathname: this.context.location.pathname + (
          (this.context.location.search && this.context.location.search.indexOf('mock') > -1) ?
            '?mock' : ''),
      });
    } else {
      this.context.router.goBack();
    }
  }

  openFeedback = () => {
    this.context.executeAction(openFeedbackModal);
    this.toggleOffcanvas();
  }

  mainMenuModules = {
    Drawer: () => importLazy(System.import('material-ui/Drawer')),
    MainMenu: () => importLazy(System.import('./MainMenu')),
  }

  render() {
    return (
      <div>
        <LazilyLoad modules={this.mainMenuModules}>
          {({ Drawer, MainMenu }) => (
            <Drawer
              className="offcanvas"
              disableSwipeToOpen
              ref="leftNav"
              docked={false}
              open={this.getOffcanvasState()}
              openSecondary
              onRequestChange={this.onRequestChange}
            >
              <MainMenu
                openFeedback={this.openFeedback}
                toggleVisibility={this.toggleOffcanvas}
                showDisruptionInfo={this.getOffcanvasState()}
              />
            </Drawer>
          )}
        </LazilyLoad>
        {config.mainMenu.show ?
          <div
            onClick={this.toggleOffcanvas}
            className="icon-holder cursor-pointer main-menu-toggle"
          >
            <Icon img={'icon-icon_menu'} className="icon" />
          </div> :
          null}
      </div>);
  }
}

export default MainMenuContainer;
