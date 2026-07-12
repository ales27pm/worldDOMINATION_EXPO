import Foundation

enum TerritoryAdjacencyRegistry {
    static let adjacency: [TerritoryID: [TerritoryID]] = [
        .alaska: [.northwestTerritory, .alberta],
        .northwestTerritory: [.alaska, .alberta, .ontario, .greenland],
        .greenland: [.northwestTerritory, .ontario, .quebec],
        .alberta: [.alaska, .northwestTerritory, .ontario],
        .ontario: [.northwestTerritory, .alberta, .greenland, .quebec],
        .quebec: [.ontario, .greenland]
    ]

    static func neighbours(of territory: TerritoryID) -> [TerritoryID] {
        adjacency[territory] ?? []
    }
}