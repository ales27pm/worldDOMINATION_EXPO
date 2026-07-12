import Foundation

enum TerritoryID: String, CaseIterable, Codable, Sendable, Identifiable {
    var id: String { rawValue }

    case alaska, northwestTerritory, greenland, alberta, ontario, quebec
    case westernUS, easternUS, centralAmerica, hawaii
    case venezuela, peru, brazil, argentina, falklandIslands
    case iceland, scandinavia, greatBritain, northernEurope
    case westernEurope, southernEurope, ukraine, svalbard
    case northAfrica, egypt, eastAfrica, congo, southAfrica, madagascar, westAfrica
    case ural, siberia, yakutsk, kamchatka, irkutsk, mongolia, japan
    case afghanistan, china, middleEast, india, siam, philippines
    case indonesia, newGuinea, westernAustralia, easternAustralia, newZealand

    static let extraTerritories: Set<TerritoryID> = [
        .hawaii, .svalbard, .philippines, .falklandIslands, .madagascar, .newZealand
    ]

    var isExtra: Bool { Self.extraTerritories.contains(self) }

    static let baseTerritories: [TerritoryID] = allCases.filter { !$0.isExtra }

    var displayName: String {
        switch self {
        case .alaska: "Alaska"
        case .northwestTerritory: "NW Territory"
        case .greenland: "Greenland"
        case .alberta: "Alberta"
        case .ontario: "Ontario"
        case .quebec: "Quebec"
        case .westernUS: "W. United States"
        case .easternUS: "E. United States"
        case .centralAmerica: "Central America"
        case .hawaii: "Hawaii"
        case .venezuela: "Venezuela"
        case .peru: "Peru"
        case .brazil: "Brazil"
        case .argentina: "Argentina"
        case .falklandIslands: "Falkland Is."
        case .iceland: "Iceland"
        case .scandinavia: "Scandinavia"
        case .greatBritain: "Great Britain"
        case .northernEurope: "N. Europe"
        case .westernEurope: "W. Europe"
        case .southernEurope: "S. Europe"
        case .ukraine: "Ukraine"
        case .svalbard: "Svalbard"
        case .northAfrica: "N. Africa"
        case .egypt: "Egypt"
        case .eastAfrica: "E. Africa"
        case .congo: "Congo"
        case .southAfrica: "S. Africa"
        case .madagascar: "Madagascar"
        case .westAfrica: "W. Africa"
        case .ural: "Ural"
        case .siberia: "Siberia"
        case .yakutsk: "Yakutsk"
        case .kamchatka: "Kamchatka"
        case .irkutsk: "Irkutsk"
        case .mongolia: "Mongolia"
        case .japan: "Japan"
        case .afghanistan: "Afghanistan"
        case .china: "China"
        case .middleEast: "Middle East"
        case .india: "India"
        case .siam: "Siam"
        case .philippines: "Philippines"
        case .indonesia: "Indonesia"
        case .newGuinea: "New Guinea"
        case .westernAustralia: "W. Australia"
        case .easternAustralia: "E. Australia"
        case .newZealand: "New Zealand"
        }
    }
}