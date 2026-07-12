import Foundation

enum ContinentID: String, CaseIterable, Codable, Sendable, Identifiable {
    var id: String { rawValue }

    case northAmerica, southAmerica, europe, africa, asia, australia

    var displayName: String {
        switch self {
        case .northAmerica: "North America"
        case .southAmerica: "South America"
        case .europe: "Europe"
        case .africa: "Africa"
        case .asia: "Asia"
        case .australia: "Australia"
        }
    }

    var classicBonusArmies: Int {
        switch self {
        case .northAmerica: 5
        case .southAmerica: 2
        case .europe: 5
        case .africa: 3
        case .asia: 7
        case .australia: 2
        }
    }

    var sameTimeBonusArmies: Int {
        switch self {
        case .northAmerica: 6
        case .southAmerica: 4
        case .europe: 6
        case .africa: 5
        case .asia: 8
        case .australia: 4
        }
    }

    func bonusArmies(mode: GameMode) -> Int {
        switch mode {
        case .classic: classicBonusArmies
        case .sameTime: sameTimeBonusArmies
        }
    }

    var territories: [TerritoryID] { baseTerritories }

    var bonusArmies: Int { classicBonusArmies }

    var baseTerritories: [TerritoryID] {
        switch self {
        case .northAmerica:
            [.alaska, .northwestTerritory, .greenland, .alberta, .ontario, .quebec, .westernUS, .easternUS, .centralAmerica]
        case .southAmerica:
            [.venezuela, .peru, .brazil, .argentina]
        case .europe:
            [.iceland, .scandinavia, .greatBritain, .northernEurope, .westernEurope, .southernEurope, .ukraine]
        case .africa:
            [.northAfrica, .egypt, .eastAfrica, .congo, .southAfrica, .westAfrica]
        case .asia:
            [.ural, .siberia, .yakutsk, .kamchatka, .irkutsk, .mongolia, .japan, .afghanistan, .china, .middleEast, .india, .siam]
        case .australia:
            [.indonesia, .newGuinea, .westernAustralia, .easternAustralia]
        }
    }

    var extraTerritory: TerritoryID? {
        switch self {
        case .northAmerica: .hawaii
        case .southAmerica: .falklandIslands
        case .europe: .svalbard
        case .africa: .madagascar
        case .asia: .philippines
        case .australia: .newZealand
        }
    }

    func territories(includeExtra: Bool) -> [TerritoryID] {
        if includeExtra, let extra = extraTerritory {
            return baseTerritories + [extra]
        }
        return baseTerritories
    }

    var color: String {
        switch self {
        case .northAmerica: "continentNA"
        case .southAmerica: "continentSA"
        case .europe: "continentEU"
        case .africa: "continentAF"
        case .asia: "continentAS"
        case .australia: "continentAU"
        }
    }
}