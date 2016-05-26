import React from 'react';
import Relay from 'react-relay';
import ItineraryTab from '../itinerary/itinerary-tab';
import { FormattedMessage } from 'react-intl';
import SwipeableViews from 'react-swipeable-views';
import ItineraryLine from '../map/itinerary-line';
import Icon from '../icon/icon';
import { getRoutePath } from '../../util/path';
import Tabs from 'material-ui/Tabs/Tabs';
import Tab from 'material-ui/Tabs/Tab';
import Map from '../map/map';
import moment from 'moment';
import config from '../../config';
import ItinerarySummaryListContainer from '../summary/itinerary-summary-list-container';

class ItineraryPlanContainer extends React.Component {
  static contextTypes = {
    router: React.PropTypes.object.isRequired,
  };

  constructor() {
    super();

    this.state = {
      lat: undefined,
      lon: undefined,
      fullscreen: false,
    };

    this.focusMap = this.focusMap.bind(this);
    this.toggleFullscreenMap = this.toggleFullscreenMap.bind(this);
    this.switchSlide = this.switchSlide.bind(this);
  }

  getSlides(itineraries) {
    return itineraries.map((itinerary, i) => (
      <div className="itinerary-slide-container" key={i}>
        <ItineraryTab
          ref={`itineraryTab${i}`}
          focus={this.focusMap}
          itinerary={itinerary}
          index={i}
        />
      </div>
    ));
  }

  getTabs(itineraries, selectedIndex) {
    return itineraries.map((itinerary, i) => (
      <Tab
        selected={i === selectedIndex}
        key={i}
        label="•"
        value={i}
        className={i === selectedIndex ? 'itinerary-tab-root--selected' : 'itinerary-tab-root'}
        style={{
          height: '18px',
          color: i === selectedIndex ? '#007ac9' : '#ddd',
          fontSize: '34px',
          padding: '0px',
        }}
      />
    ));
  }

  toggleFullscreenMap() {
    this.setState({
      fullscreen: !this.state.fullscreen,
    });
  }

  focusMap(lat, lon) {
    this.setState({
      lat,
      lon,
    });
  }

  switchSlide(index) {
    this.context.router.replace(
      `${getRoutePath(this.props.fromPlace, this.props.toPlace)}/${index}`);
    const itineraryTab = this.refs[`itineraryTab${index}`];

    if (itineraryTab && itineraryTab.state) {
      this.focusMap(itineraryTab.state.lat, itineraryTab.state.lon);
    }
  }

  render() {
    let leafletObjs;
    let content;
    let itinerary;
    let index;
    let itineraries;
    let plan;

    if (this.props.plan && this.props.plan.plan) {
      plan = this.props.plan.plan;
      itineraries = plan.itineraries;
      index = parseInt(this.props.hash, 10) || 0;
      itinerary = itineraries[index];
    }

    if (itinerary && itinerary.legs) {
      leafletObjs = [
        <ItineraryLine
          key={`line${this.props.hash}`}
          legs={itinerary.legs}
          showFromToMarkers
          showTransferLabels
        />];

      if (this.state.fullscreen) {
        content = (
          <div
            style={{ height: '100%' }}
            onTouchStart={e => e.stopPropagation()}
            onMouseDown={e => e.stopPropagation()}
          >
            <Map
              ref="map2"
              className="fullscreen"
              leafletObjs={leafletObjs}
              lat={this.state.lat ? this.state.lat : itinerary.legs[0].from.lat}
              lon={this.state.lon ? this.state.lon : itinerary.legs[0].from.lon}
              zoom={16}
              fitBounds={false}
            >
              <div
                className="fullscreen-toggle"
                onClick={this.toggleFullscreenMap}
              >
                <Icon
                  img="icon-icon_maximize"
                  className="cursor-pointer"
                />
              </div>
            </Map>
          </div>);
      } else {
        content = (
          <div className="itinerary-container-content">
            <div
              onTouchStart={e => e.stopPropagation()}
              onMouseDown={e => e.stopPropagation()}
            >
              <Map
                ref="map"
                leafletObjs={leafletObjs}
                lat={this.state.lat ? this.state.lat : itinerary.legs[0].from.lat}
                lon={this.state.lon ? this.state.lon : itinerary.legs[0].from.lon}
                zoom={16}
                fitBounds={false}
                leafletOptions={{
                  dragging: false,
                  touchZoom: false,
                  scrollWheelZoom: false,
                  doubleClickZoom: false,
                  boxZoom: false,
                }}
              >
                <div
                  className="map-click-prevent-overlay"
                  onClick={this.toggleFullscreenMap}
                />
                <div
                  className="fullscreen-toggle"
                  onClick={this.toggleFullscreenMap}
                >
                  <Icon
                    img="icon-icon_maximize"
                    className="cursor-pointer"
                  />
                </div>
              </Map>
            </div>
            <SwipeableViews
              index={index}
              className="itinerary-swipe-views-root"
              slideStyle={{ height: '100%' }}
              containerStyle={{ height: '100%' }}
              onChangeIndex={(idx) => setTimeout(this.switchSlide, 150, idx)}
            >
              {this.getSlides(itineraries)}
            </SwipeableViews>
            <div className="itinerary-tabs-container">
              <Tabs
                onChange={this.switchSlide}
                value={index}
                tabItemContainerStyle={{
                  backgroundColor: '#eef1f3',
                  lineHeight: '18px',
                  width: '60px',
                  marginLeft: 'auto',
                  marginRight: 'auto',
                }}
                inkBarStyle={{ display: 'none' }}
              >
                {this.getTabs(itineraries, index)}
              </Tabs>
            </div>
          </div>);
      }
    } else {
      return (
        <div className="itinerary-no-route-found">
          <FormattedMessage
            id="no-route-msg"
            defaultMessage={`
              Unfortunately no route was found between the locations you gave.
              Please change origin and/or destination address.
            `}
          />
        </div>);
    }
    return content;
  }
}

export const ItineraryPlanContainerFragments = {
  plan: () => Relay.QL`
    fragment on QueryType {
      plan(
        fromPlace: $fromPlace,
        toPlace: $toPlace,
        numItineraries: $numItineraries,
        modes: $modes,
        date: $date,
        time: $time,
        walkReluctance: $walkReluctance,
        walkBoardCost: $walkBoardCost,
        minTransferTime: $minTransferTime,
        walkSpeed: $walkSpeed,
        maxWalkDistance: $maxWalkDistance,
        wheelchair: $wheelchair,
        disableRemainingWeightHeuristic: $disableRemainingWeightHeuristic,
        arriveBy: $arriveBy,
        preferred: $preferred)
      {
        itineraries {
          walkDistance
          duration
          startTime
          endTime

          legs {
            mode
            agency {
              name
            }
            from {
              lat
              lon
              name
              vertexType
              bikeRentalStation {
                stationId
              }
              stop {
                gtfsId
                code
              }
            }
            to {
              lat
              lon
              name
              vertexType
              bikeRentalStation {
                stationId
              }
              stop {
                gtfsId
                code
              }
            }
            legGeometry {
              length
              points
            }
            intermediateStops {
              gtfsId
              lat
              lon
              name
              code
            }
            realTime
            transitLeg
            rentedBike
            startTime
            endTime
            mode
            distance
            duration
            route {
              shortName
            }
            trip {
              gtfsId
              tripHeadsign
            }
          }
          ${ItinerarySummaryListContainer.getFragment('itineraries')}
        }
      }
    }
  `,
};

export default Relay.createContainer(ItineraryPlanContainer, {
  fragments: ItineraryPlanContainerFragments,

  initialVariables: {
    from: null,
    to: null,
    fromPlace: null,
    toPlace: null,
    numItineraries: 3,
    modes: 'BUS,TRAM,RAIL,SUBWAY,FERRY,WALK',
    date: moment().format('YYYY-MM-DD'),
    time: moment().format('HH:mm:ss'),
    walkReluctance: 2.0001,
    walkBoardCost: 600,
    minTransferTime: 180,
    walkSpeed: 1.2,
    wheelchair: false,
    maxWalkDistance: config.maxWalkDistance + 0.1,

    preferred: {
      agencies: config.preferredAgency || '',
    },

    arriveBy: true,
    disableRemainingWeightHeuristic: false,
  },
});

ItineraryPlanContainer.propTypes = {
  fromPlace: React.PropTypes.string.isRequired,
  toPlace: React.PropTypes.string.isRequired,
  plan: React.PropTypes.object,
  hash: React.PropTypes.string.isRequired,
};
