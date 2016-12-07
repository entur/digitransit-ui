import Relay from 'react-relay';

import get from 'lodash/get';
import take from 'lodash/take';
import orderBy from 'lodash/orderBy';
import sortBy from 'lodash/sortBy';
import debounce from 'lodash/debounce';
import flatten from 'lodash/flatten';

import config from '../config';

import { getJson } from './xhrPromise';
import routeCompare from './route-compare';
import { getLatLng } from './geo-utils';
import { uniqByLabel } from './suggestionUtils';

function getRelayQuery(query) {
  return new Promise((resolve, reject) => {
    const callback = (readyState) => {
      if (readyState.error) {
        reject(readyState.error);
      } else if (readyState.done) {
        resolve(Relay.Store.readQuery(query));
      }
    };

    Relay.Store.primeCache({ query }, callback);
  });
}

function mapRoutes(res) {
  return res.map(item =>
    ({
      type: 'Route',
      properties: {
        ...item,
        layer: `route-${item.mode}`,
        link: `/linjat/${item.gtfsId}`,
      },
      geometry: {
        coordinates: null,
      },
    })
  );
}

function mapStops(stops) {
  return stops.map(item => ({
    type: 'Stop',
    properties: {
      ...item,
      mode: item.routes.length > 0 && item.routes[0].mode.toLowerCase(),
      layer: 'stop',
      link: `/pysakit/${item.gtfsId}`,
    },
    geometry: {
      coordinates: [item.lon, item.lat],
    },
  }));
}


function filterMatchingToInput(list, input, fields) {
  if (typeof input === 'string' && input.length > 0) {
    return list.filter((item) => {
      const parts = fields.map(pName => get(item, pName));

      const test = parts.join(' ').toLowerCase();
      return test.indexOf(input.toLowerCase()) > -1;
    });
  }

  return list;
}

function getCurrentPositionIfEmpty(input, useCurrentPosition) {
  if (!useCurrentPosition && (typeof input !== 'string' || input.length === 0)) {
    return Promise.resolve([{
      type: 'CurrentLocation',
      properties: { labelId: 'own-position', layer: 'currentPosition' },
    }]);
  }

  return Promise.resolve([]);
}

function getOldSearches(oldSearches, input) {
  const matchingOldSearches =
    filterMatchingToInput(oldSearches, input, [
      'properties.name',
      'properties.label',
      'properties.shortName',
      'properties.longName',
      'properties.name',
      'properties.desc',
    ]);

  return Promise.resolve(
    take(matchingOldSearches, 10).map(item => ({
      ...item,
      type: 'OldSearch',
    }))
  );
}

function getFavouriteLocations(favourites, input) {
  return Promise.resolve(
    orderBy(
      filterMatchingToInput(favourites, input, ['address', 'locationName']),
      feature => feature.locationName
    ).map(item =>
      ({
        type: 'FavouritePlace',
        properties: { ...item, label: item.locationName, layer: 'favouritePlace' },
        geometry: { type: 'Point', coordinates: [item.lon, item.lat] },
      })
  ));
}

function getGeocodingResult(input, geolocation, language) {
  // TODO: minimum length should be in config
  if (input === undefined || input === null || input.trim().length < 3) {
    return Promise.resolve([]);
  }

  const focusPoint = (config.autoSuggest.locationAware && geolocation.hasLocation) ? {
    // Round coordinates to approx 1 km, in order to improve caching
    'focus.point.lat': geolocation.lat.toFixed(2), 'focus.point.lon': geolocation.lon.toFixed(2),
  } : {};

  const opts = { text: input, ...config.searchParams, ...focusPoint, lang: language };

  return getJson(config.URL.PELIAS, opts)
    .then(res => orderBy(res.features.map((feature) => {
      /* eslint no-param-reassign: ["error", { "props": false }] */
      feature.properties.label = `${feature.properties.name}, ${feature.properties.localadmin}`;
      return feature;
    }), feature => feature.properties.confidence, 'desc'));
}

function getFavouriteRoutes(favourites, input) {
  const query = Relay.createQuery(Relay.QL`
    query favouriteRoutes($ids: [String!]!) {
      routes(ids: $ids ) {
        gtfsId
        agency { name }
        shortName
        mode
        longName
      }
    }`, { ids: favourites }
  );

  return getRelayQuery(query)
    .then(favouriteRoutes => mapRoutes(favouriteRoutes))
    .then(routes => routes.map(favourite => ({
      ...favourite,
      properties: { ...favourite.properties, layer: 'favouriteRoute' },
      type: 'FavouriteRoute',
    })))
    .then(routes => filterMatchingToInput(
      routes, input, ['properties.shortName', 'properties.longName'])
    )
    .then(routes => routes.sort((x, y) => routeCompare(x.properties, y.properties)));
}

function getFavouriteStops(favourites, input, origin) {
  const query = Relay.createQuery(Relay.QL`
    query favouriteStops($ids: [String!]!) {
      stops(ids: $ids ) {
        gtfsId
        lat
        lon
        name
        desc
        code
        routes { mode }
      }
    }`, { ids: favourites }
  );

  const refLatLng = origin.lat && origin.lon && getLatLng(origin.lat, origin.lon);

  return getRelayQuery(query)
    .then(favouriteStops => mapStops(favouriteStops).map(favourite => ({
      ...favourite,
      properties: { ...favourite.properties, layer: 'favouriteStop' },
      type: 'FavouriteStop',
    })))
    .then(stops => filterMatchingToInput(stops, input, ['properties.name', 'properties.desc']))
    .then(stops => (
      refLatLng ?
      sortBy(stops, item =>
        getLatLng(item.geometry.coordinates[1], item.geometry.coordinates[0]).distanceTo(refLatLng)
      ) : stops
  ));
}


function getRoutes(input) {
  if (typeof input !== 'string' || input.trim().length === 0) {
    return Promise.resolve([]);
  }
  const number = input.match(/^\d+$/);
  if (number && number[0].length > 3) {
    return Promise.resolve([]);
  }

  const query = Relay.createQuery(Relay.QL`
    query routes($name: String) {
      viewer {
        routes(name: $name ) {
          gtfsId
          agency {name} 
          shortName
          mode
          longName
        }
      }
    }`, { name: input }
  );

  return getRelayQuery(query).then(data =>
    mapRoutes(data[0].routes).sort((x, y) => routeCompare(x.properties, y.properties))
  ).then(suggestions => take(suggestions, 10));
}

function getStops(input, origin) {
  if (typeof input !== 'string' || input.trim().length === 0) {
    return Promise.resolve([]);
  }
  const number = input.match(/^\d+$/);
  if (number && number[0].length !== 4) {
    return Promise.resolve([]);
  }

  const query = Relay.createQuery(Relay.QL`
    query stops($name: String) {
      viewer {
        stops(name: $name ) {
          gtfsId
          lat
          lon
          name
          desc
          code
          routes { mode }
        }
      }
    }`, { name: input }
  );

  const refLatLng = origin.lat && origin.lon && getLatLng(origin.lat, origin.lon);

  return getRelayQuery(query).then(data => mapStops(data[0].stops)).then(stops => (
    refLatLng ?
    sortBy(stops, item =>
      Math.round(
        getLatLng(item.geometry.coordinates[1], item.geometry.coordinates[0])
        .distanceTo(refLatLng) / 50000) // divide in 50km buckets
    ) : stops
  )).then(suggestions => take(suggestions, 10));
}

const lookupCountyAndMunicipality = (item) => {
  if (!item.properties.localadmin) {
    const parameters = {
      'point.lat': item.geometry.coordinates[1],
      'point.lon': item.geometry.coordinates[0],
      size: 1,
    };
    return getJson(config.URL.PELIAS_REVERSE_GEOCODER, parameters)
            .then((peliasResult) => {
              const stop = { ...item };
              const firstFeature = peliasResult.features[0];
              if (firstFeature) {
                stop.properties.county = firstFeature.properties.county;
                stop.properties.localadmin = firstFeature.properties.localadmin;
                stop.properties.name = `${stop.properties.name}, ${firstFeature.properties.localadmin}`;
                stop.properties.label = stop.properties.name;
              }
              return Promise.resolve(stop);
            });
  }
  return Promise.resolve(item);
};

const formatOptionalStops = (optionalStops) => {
  const promises = [];
  optionalStops.forEach((item) => {
    if (item.type === 'Stop' && item.properties) {
      /* Remove link in order to use this as an endpoint */
      delete item.properties.link; // eslint-disable-line no-param-reassign
      promises.push(lookupCountyAndMunicipality(item));
    }
  });
  return Promise.all(promises);
};

const getOptionalStops = (input, origin) => new Promise((resolve, reject) => {
  if (!config.search.useOTPEndPoints) {
    return resolve([]);
  }
  return getStops(input, origin).then(stops => resolve(formatOptionalStops(stops))).catch((err) => {
    reject(err);
  });
});

export function executeSearchImmediate(getStore, { input, type }, callback) {
  const position = getStore('PositionStore').getLocationState();
  let endPointSearches = [];
  let searchSearches = [];

  if (type === 'endpoint' || type === 'all') {
    const origin = getStore('EndpointStore').getOrigin();
    const favouriteLocations = getStore('FavouriteLocationStore').getLocations();
    const oldSearches = getStore('OldSearchesStore').getOldSearches('endpoint');
    const language = getStore('PreferencesStore').getLanguage();

    endPointSearches = Promise.all([
      getCurrentPositionIfEmpty(input, origin.useCurrentPosition),
      getFavouriteLocations(favouriteLocations, input),
      getOldSearches(oldSearches, input),
      getOptionalStops(input, position),
      getGeocodingResult(input, position, language),
    ])
    .then(flatten)
    .then(uniqByLabel)
    .catch(err => console.error(err)); // eslint-disable-line no-console

    if (type === 'endpoint') {
      endPointSearches.then(callback);
      return;
    }
  }

  if (type === 'search' || type === 'all') {
    const origin = getStore('EndpointStore').getOrigin();
    const location = origin.lat ? origin : position;
    const oldSearches = getStore('OldSearchesStore').getOldSearches('search');
    const favouriteRoutes = getStore('FavouriteRoutesStore').getRoutes();
    const favouriteStops = getStore('FavouriteStopsStore').getStops();

    searchSearches = Promise.all([
      getFavouriteRoutes(favouriteRoutes, input),
      getFavouriteStops(favouriteStops, input, origin),
      getOldSearches(oldSearches, input),
      getRoutes(input),
      getStops(input, location),
    ])
    .then(flatten)
    .then(uniqByLabel)
    .catch(err => console.error(err)); // eslint-disable-line no-console

    if (type === 'search') {
      searchSearches.then(callback);
      return;
    }
  }

  Promise.all([endPointSearches, searchSearches])
    .then(([endpoints, search]) => callback([
      { name: 'endpoint', items: endpoints },
      { name: 'search', items: search },
    ]))
    .catch(err => console.error(err)); // eslint-disable-line no-console
}

const debouncedSearch = debounce(executeSearchImmediate, 300);

export const executeSearch = (getStore, data, callback) => {
  callback([]);
  debouncedSearch(getStore, data, callback);
};
