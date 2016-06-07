/* eslint no-underscore-dangle: "off" */

import { Children, PropTypes } from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Map, popup } from 'leaflet';

import latlngType from 'react-leaflet/lib/types/latlng';
import MapComponent from 'react-leaflet/lib/MapComponent';

export default class Popup extends MapComponent {
  static propTypes = {
    children: PropTypes.node,
    map: PropTypes.instanceOf(Map),
    popupContainer: PropTypes.object,
    position: latlngType,
  };

  componentWillMount() {
    super.componentWillMount();
    const { popupContainer, ...props } = this.props;

    this.leafletElement = popup(props, popupContainer);
    this.leafletElement.on('add', this.renderPopupContent.bind(this));
    this.leafletElement.on('remove', this.removePopupContent.bind(this));
  }

  componentDidMount() {
    const { map, popupContainer, position } = this.props;
    const el = this.leafletElement;

    if (popupContainer) {
      // Attach to container component
      popupContainer.bindPopup(el);
    } else {
      // Attach to a Map
      if (position) {
        el.setLatLng(position);
      }
      el.openOn(map);
    }
    el.options.autoPan = false;
  }

  componentDidUpdate(prevProps) {
    const { position } = this.props;

    if (position !== prevProps.position) {
      this.leafletElement.setLatLng(position);
    }

    if (this.leafletElement.isOpen()) {
      this.renderPopupContent();
    }
  }

  componentWillUnmount() {
    super.componentWillUnmount();
    this.removePopupContent();
    this.props.map.removeLayer(this.leafletElement);
  }

  renderPopupContent() {
    if (this.props.children) {
      render(
        Children.only(this.props.children),
        this.leafletElement._contentNode
      );

      this.leafletElement._updateLayout();
      this.leafletElement._updatePosition();
      this.leafletElement._adjustPan();
    } else {
      this.removePopupContent();
    }
  }

  removePopupContent() {
    if (this.leafletElement._contentNode) {
      unmountComponentAtNode(this.leafletElement._contentNode);
    }
  }

  render() {
    return null;
  }
}
