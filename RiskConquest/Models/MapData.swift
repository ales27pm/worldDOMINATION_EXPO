import Foundation

struct TerritoryMapInfo: Sendable {
    let id: TerritoryID
    let x: Double
    let y: Double
    let continent: ContinentID
    let neighbors: [TerritoryID]
}

enum MapData {
    static let territories: [TerritoryID: TerritoryMapInfo] = {
        var map: [TerritoryID: TerritoryMapInfo] = [:]
        for info in allTerritories {
            map[info.id] = info
        }
        return map
    }()

    static func activeTerritories(includeExtra: Bool, middleEastEastAfrica: Bool = true) -> [TerritoryMapInfo] {
        var result = allTerritories.filter { !$0.id.isExtra || includeExtra }
        if middleEastEastAfrica {
            result = result.map { info in
                if info.id == .eastAfrica && !info.neighbors.contains(.middleEast) {
                    return TerritoryMapInfo(id: info.id, x: info.x, y: info.y, continent: info.continent,
                        neighbors: info.neighbors + [.middleEast])
                }
                if info.id == .middleEast && !info.neighbors.contains(.eastAfrica) {
                    return TerritoryMapInfo(id: info.id, x: info.x, y: info.y, continent: info.continent,
                        neighbors: info.neighbors + [.eastAfrica])
                }
                return info
            }
        }
        return result
    }

    static let allTerritories: [TerritoryMapInfo] = [
        TerritoryMapInfo(id: .alaska, x: 0.06, y: 0.15, continent: .northAmerica,
            neighbors: [.northwestTerritory, .alberta, .kamchatka]),
        TerritoryMapInfo(id: .northwestTerritory, x: 0.14, y: 0.11, continent: .northAmerica,
            neighbors: [.alaska, .alberta, .ontario, .greenland]),
        TerritoryMapInfo(id: .greenland, x: 0.30, y: 0.06, continent: .northAmerica,
            neighbors: [.northwestTerritory, .ontario, .quebec, .iceland, .svalbard]),
        TerritoryMapInfo(id: .alberta, x: 0.11, y: 0.22, continent: .northAmerica,
            neighbors: [.alaska, .northwestTerritory, .ontario, .westernUS]),
        TerritoryMapInfo(id: .ontario, x: 0.18, y: 0.21, continent: .northAmerica,
            neighbors: [.northwestTerritory, .alberta, .greenland, .quebec, .westernUS, .easternUS]),
        TerritoryMapInfo(id: .quebec, x: 0.24, y: 0.20, continent: .northAmerica,
            neighbors: [.ontario, .greenland, .easternUS]),
        TerritoryMapInfo(id: .westernUS, x: 0.11, y: 0.32, continent: .northAmerica,
            neighbors: [.alberta, .ontario, .easternUS, .centralAmerica, .hawaii]),
        TerritoryMapInfo(id: .easternUS, x: 0.19, y: 0.33, continent: .northAmerica,
            neighbors: [.ontario, .quebec, .westernUS, .centralAmerica]),
        TerritoryMapInfo(id: .centralAmerica, x: 0.13, y: 0.42, continent: .northAmerica,
            neighbors: [.westernUS, .easternUS, .venezuela]),
        TerritoryMapInfo(id: .hawaii, x: 0.03, y: 0.39, continent: .northAmerica,
            neighbors: [.westernUS, .japan]),

        TerritoryMapInfo(id: .venezuela, x: 0.20, y: 0.49, continent: .southAmerica,
            neighbors: [.centralAmerica, .peru, .brazil]),
        TerritoryMapInfo(id: .peru, x: 0.19, y: 0.61, continent: .southAmerica,
            neighbors: [.venezuela, .brazil, .argentina]),
        TerritoryMapInfo(id: .brazil, x: 0.26, y: 0.56, continent: .southAmerica,
            neighbors: [.venezuela, .peru, .argentina, .northAfrica]),
        TerritoryMapInfo(id: .argentina, x: 0.215, y: 0.73, continent: .southAmerica,
            neighbors: [.peru, .brazil, .falklandIslands, .newZealand]),
        TerritoryMapInfo(id: .falklandIslands, x: 0.27, y: 0.845, continent: .southAmerica,
            neighbors: [.argentina, .madagascar]),

        TerritoryMapInfo(id: .iceland, x: 0.375, y: 0.12, continent: .europe,
            neighbors: [.greenland, .scandinavia, .greatBritain, .svalbard]),
        TerritoryMapInfo(id: .scandinavia, x: 0.47, y: 0.10, continent: .europe,
            neighbors: [.iceland, .greatBritain, .northernEurope, .ukraine, .svalbard]),
        TerritoryMapInfo(id: .greatBritain, x: 0.38, y: 0.22, continent: .europe,
            neighbors: [.iceland, .scandinavia, .northernEurope, .westernEurope]),
        TerritoryMapInfo(id: .northernEurope, x: 0.46, y: 0.22, continent: .europe,
            neighbors: [.scandinavia, .greatBritain, .westernEurope, .southernEurope, .ukraine]),
        TerritoryMapInfo(id: .westernEurope, x: 0.39, y: 0.33, continent: .europe,
            neighbors: [.greatBritain, .northernEurope, .southernEurope, .northAfrica]),
        TerritoryMapInfo(id: .southernEurope, x: 0.47, y: 0.32, continent: .europe,
            neighbors: [.northernEurope, .westernEurope, .ukraine, .northAfrica, .egypt, .middleEast]),
        TerritoryMapInfo(id: .ukraine, x: 0.55, y: 0.19, continent: .europe,
            neighbors: [.scandinavia, .northernEurope, .southernEurope, .ural, .afghanistan, .middleEast]),
        TerritoryMapInfo(id: .svalbard, x: 0.44, y: 0.03, continent: .europe,
            neighbors: [.greenland, .iceland, .scandinavia]),

        TerritoryMapInfo(id: .northAfrica, x: 0.42, y: 0.47, continent: .africa,
            neighbors: [.westernEurope, .southernEurope, .egypt, .eastAfrica, .congo, .brazil, .westAfrica]),
        TerritoryMapInfo(id: .egypt, x: 0.50, y: 0.42, continent: .africa,
            neighbors: [.southernEurope, .northAfrica, .eastAfrica, .middleEast]),
        TerritoryMapInfo(id: .eastAfrica, x: 0.53, y: 0.56, continent: .africa,
            neighbors: [.egypt, .northAfrica, .congo, .southAfrica, .madagascar]),
        TerritoryMapInfo(id: .congo, x: 0.47, y: 0.61, continent: .africa,
            neighbors: [.northAfrica, .eastAfrica, .southAfrica, .westAfrica]),
        TerritoryMapInfo(id: .southAfrica, x: 0.49, y: 0.73, continent: .africa,
            neighbors: [.congo, .eastAfrica, .madagascar]),
        TerritoryMapInfo(id: .madagascar, x: 0.585, y: 0.73, continent: .africa,
            neighbors: [.eastAfrica, .southAfrica, .falklandIslands]),
        TerritoryMapInfo(id: .westAfrica, x: 0.375, y: 0.56, continent: .africa,
            neighbors: [.northAfrica, .congo]),

        TerritoryMapInfo(id: .ural, x: 0.63, y: 0.16, continent: .asia,
            neighbors: [.ukraine, .siberia, .china, .afghanistan]),
        TerritoryMapInfo(id: .siberia, x: 0.71, y: 0.10, continent: .asia,
            neighbors: [.ural, .yakutsk, .irkutsk, .mongolia, .china]),
        TerritoryMapInfo(id: .yakutsk, x: 0.79, y: 0.08, continent: .asia,
            neighbors: [.siberia, .kamchatka, .irkutsk]),
        TerritoryMapInfo(id: .kamchatka, x: 0.895, y: 0.12, continent: .asia,
            neighbors: [.yakutsk, .irkutsk, .mongolia, .japan, .alaska]),
        TerritoryMapInfo(id: .irkutsk, x: 0.77, y: 0.19, continent: .asia,
            neighbors: [.siberia, .yakutsk, .kamchatka, .mongolia]),
        TerritoryMapInfo(id: .mongolia, x: 0.77, y: 0.27, continent: .asia,
            neighbors: [.siberia, .irkutsk, .kamchatka, .japan, .china]),
        TerritoryMapInfo(id: .japan, x: 0.895, y: 0.26, continent: .asia,
            neighbors: [.kamchatka, .mongolia, .philippines, .hawaii]),
        TerritoryMapInfo(id: .afghanistan, x: 0.62, y: 0.30, continent: .asia,
            neighbors: [.ukraine, .ural, .china, .middleEast, .india]),
        TerritoryMapInfo(id: .china, x: 0.73, y: 0.34, continent: .asia,
            neighbors: [.ural, .siberia, .mongolia, .afghanistan, .india, .siam]),
        TerritoryMapInfo(id: .middleEast, x: 0.56, y: 0.38, continent: .asia,
            neighbors: [.ukraine, .southernEurope, .egypt, .afghanistan, .india]),
        TerritoryMapInfo(id: .india, x: 0.67, y: 0.42, continent: .asia,
            neighbors: [.afghanistan, .china, .middleEast, .siam]),
        TerritoryMapInfo(id: .siam, x: 0.76, y: 0.44, continent: .asia,
            neighbors: [.china, .india, .indonesia, .philippines]),
        TerritoryMapInfo(id: .philippines, x: 0.84, y: 0.42, continent: .asia,
            neighbors: [.siam, .indonesia, .japan]),

        TerritoryMapInfo(id: .indonesia, x: 0.77, y: 0.57, continent: .australia,
            neighbors: [.siam, .newGuinea, .westernAustralia, .philippines]),
        TerritoryMapInfo(id: .newGuinea, x: 0.885, y: 0.54, continent: .australia,
            neighbors: [.indonesia, .westernAustralia, .easternAustralia]),
        TerritoryMapInfo(id: .westernAustralia, x: 0.82, y: 0.70, continent: .australia,
            neighbors: [.indonesia, .easternAustralia, .newGuinea]),
        TerritoryMapInfo(id: .easternAustralia, x: 0.89, y: 0.67, continent: .australia,
            neighbors: [.newGuinea, .westernAustralia, .newZealand]),
        TerritoryMapInfo(id: .newZealand, x: 0.955, y: 0.76, continent: .australia,
            neighbors: [.easternAustralia, .argentina]),
    ]
}