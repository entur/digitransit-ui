Store   = require 'fluxible/addons/BaseStore'
storage = require './local-storage'

STORAGE_KEY = "mode"

class ModeStore extends Store
  @storeName: 'ModeStore'

  constructor: (dispatcher) ->
    super(dispatcher)
    localData = storage.getItem STORAGE_KEY
    @data = if localData then JSON.parse(localData) else
      busState: true
      tramState: true
      railState: true
      subwayState: true
      ferryState: true
      citybikeState: false

  getData: ->
    @data

  getMode: ->
    mode = []
    if @getBusState() then mode.push "BUS"
    if @getTramState() then mode.push "TRAM"
    if @getRailState() then mode.push "RAIL"
    if @getSubwayState() then mode.push "SUBWAY"
    if @getFerryState() then mode.push "FERRY"
    if @getCitybikeState() then mode.push "BICYCLE_RENT"
    mode.push "AIRPLANE"
    return mode

  getModeString: =>
    return @getMode.join(",")

  getBusState: ->
    @data.busState
  getTramState: ->
    @data.tramState
  getRailState: ->
    @data.railState
  getSubwayState: ->
    @data.subwayState
  getFerryState: ->
    @data.ferryState
  getCitybikeState: ->
    @data.citybikeState

  toggleBusState: ->
    @data.busState = !@data.busState
    @storeMode()
    @emitChange()
  toggleTramState: ->
    @data.tramState = !@data.tramState
    @storeMode()
    @emitChange()
  toggleRailState: ->
    @data.railState = !@data.railState
    @storeMode()
    @emitChange()
  toggleSubwayState: ->
    @data.subwayState = !@data.subwayState
    @storeMode()
    @emitChange()
  toggleFerryState: ->
    @data.ferryState = !@data.ferryState
    @storeMode()
    @emitChange()
  toggleCitybikeState: ->
    @data.citybikeState = !@data.citybikeState
    @storeMode()
    @emitChange()

  storeMode: ->
    storage.setItem STORAGE_KEY, @data

  clearMode: ->
    @data = {}
    storage.removeItem STORAGE_KEY
    @emitChange()

  dehydrate: ->
    @data

  rehydrate: (data) ->
    @data = data

  @handlers:
    "ToggleNearbyRouteBusState": 'toggleBusState'
    "ToggleNearbyRouteTramState": 'toggleTramState'
    "ToggleNearbyRouteRailState": 'toggleRailState'
    "ToggleNearbyRouteSubwayState": 'toggleSubwayState'
    "ToggleNearbyRouteFerryState": 'toggleFerryState'
    "ToggleNearbyRouteCitybikeState": 'toggleCitybikeState'

module.exports = ModeStore
