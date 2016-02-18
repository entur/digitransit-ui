React                 = require 'react'
Icon                  = require '../../icon/icon.cjsx'
Link                  = require 'react-router/lib/Link'
{FormattedMessage}    = require 'react-intl'
RouteDestination      = require '../../departure/route-destination'
routeCompare          = require '../../../util/route-compare'

class StopMarkerSelectPopup extends React.Component
  render: ->
    options = @props.options.map (option) ->
      patternData = JSON.parse(option.properties.patterns).sort(routeCompare)

      patterns = []
      patterns.push(
        <div key="first" className="route-detail-text">
          <span className={patternData[0].type.toLowerCase() + " vehicle-number no-padding"}>{patternData[0].shortName}</span> {#Repalce with RouteNumber}
          <RouteDestination mode={patternData[0].type} destination={patternData[0].headsign} />
        </div>)

      if patternData.length > 1
        patterns.push(
          <div key="second" className="route-detail-text">
            Lisäksi{patternData[1..].map((p) -> if p.shortName then <span style={padding: "0 2px"} className={p.type.toLowerCase() + " vehicle-number"}>{p.shortName}</span> else null)}
          </div>)


      <div className="no-margin" key={option.properties.gtfsId}>
        <hr className="no-margin"/>
        <Link className="no-margin" to="/pysakit/#{option.properties.gtfsId}">
          <div className="left padding-vertical-normal" style={width: 40}>
            <svg
              xmlns="http://www.w3.org/svg/2000"
              viewBox="0 0 30 30"
              width="30"
              height="30"
              style={position: "relative", left: 5}
              className={option.properties.type.toLowerCase() + " left"}
            >
              <circle
                r="7"
                cx="15"
                cy="15"
                strokeWidth="6.5"
                fill="None"
                stroke="currentColor"
              />
            </svg>
          </div>
          <div className="left padding-vertical-normal" style={width: "calc(100% - 40px)"}>
            <span className="h4 no-margin">{option.properties.name} ›</span>
            {patterns}
          </div>
        </Link>
      </div>

    <div className="card">
      <h3 className="padding-normal">Valitse pysäkki</h3>
      {options}
    </div>


module.exports = StopMarkerSelectPopup
