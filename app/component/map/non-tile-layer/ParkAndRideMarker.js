import React from 'react';
import Relay from 'react-relay';
import provideContext from 'fluxible-addons-react/provideContext';
import { intlShape } from 'react-intl';
import ParkAndRideFacilityPopup from '../popups/ParkAndRideFacilityPopup';
import Icon from '../../Icon';
import GenericMarker from '../GenericMarker';
import ComponentUsageExample from '../../ComponentUsageExample';
import ParkAndRideFacilityRoute from '../../../route/ParkAndRideFacilityRoute';
import { isBrowser } from '../../../util/browser';

let L;

/* eslint-disable global-require */
// TODO When server side rendering is re-enabled,
//      these need to be loaded only when isBrowser is true.
//      Perhaps still using the require from webpack?
if (isBrowser) {
  L = require('leaflet');
}
/* eslint-enable global-require */


const ParkAndRideFacilityPopupWithContext = provideContext(ParkAndRideFacilityPopup, {
  intl: intlShape.isRequired,
  router: React.PropTypes.object.isRequired,
  location: React.PropTypes.object.isRequired,
  route: React.PropTypes.object.isRequired,
  getStore: React.PropTypes.func.isRequired,
  config: React.PropTypes.object.isRequired,
});

export default class ParkAndRideMarker extends React.Component {
  static description = (
    <div>
      <p>Renders a ParkAndRide marker</p>
      <ComponentUsageExample description="">
        <ParkAndRideMarker carPark={{ }} />
      </ComponentUsageExample>
    </div>
  );

  static displayName = 'ParkAndRideMarker';

  static propTypes = {
    carPark: React.PropTypes.shape({
      carParkId: React.PropTypes.string.isRequired,
      name: React.PropTypes.string.isRequired,
      lat: React.PropTypes.number.isRequired,
      lon: React.PropTypes.number.isRequired,
    }).isRequired,
    transit: React.PropTypes.bool,
  };

  static contextTypes = {
    getStore: React.PropTypes.func.isRequired,
    executeAction: React.PropTypes.func.isRequired,
    router: React.PropTypes.object.isRequired,
    location: React.PropTypes.object.isRequired,
    route: React.PropTypes.object.isRequired,
    intl: intlShape.isRequired,
    config: React.PropTypes.object.isRequired,
  };

  getIcon = (zoom) => {
    const config = this.context.config;
    const size = (!this.props.transit && zoom <= config.stopsSmallMaxZoom) ?
      config.parkAndRide.iconSize.small : config.parkAndRide.iconSize.large;

    return L.divIcon({
      html: Icon.asString('icon-icon_car_park-withoutBox', 'park-and-ride-medium-size'),
      iconSize: [size, size],
      className: 'park-and-ride cursor-pointer',
    });
  };

  render() {
    if (!isBrowser) return false;

    const { carPark } = this.props;

    return (
      <GenericMarker
        position={{
          lat: carPark.lat,
          lon: carPark.lon,
        }}
        getIcon={this.getIcon}
        id={carPark.carParkId}
      >
        <Relay.RootContainer
          Component={ParkAndRideFacilityPopup}
          route={new ParkAndRideFacilityRoute({
            id: carPark.carParkId,
            name: carPark.name,
          })}
          renderLoading={() => (
            <div className="card" style={{ height: '12rem' }}>
              <div className="spinner-loader" />
            </div>
          )}
          renderFetched={data => (
            <ParkAndRideFacilityPopupWithContext
              name={carPark.name}
              lat={carPark.lat}
              lon={carPark.lon}
              {...data}
              context={this.context}
            />
          )}
        />
      </GenericMarker>
    );
  }
}
