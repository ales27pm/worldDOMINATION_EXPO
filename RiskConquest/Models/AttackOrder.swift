import Foundation

struct AttackOrder: Identifiable, Sendable {
    let id: UUID
    let playerID: String
    let sourceTerritory: TerritoryID
    let targetTerritory: TerritoryID
    var committedArmies: Int
    var isSurge: Bool

    init(playerID: String, sourceTerritory: TerritoryID, targetTerritory: TerritoryID,
         committedArmies: Int, isSurge: Bool = false) {
        self.id = UUID()
        self.playerID = playerID
        self.sourceTerritory = sourceTerritory
        self.targetTerritory = targetTerritory
        self.committedArmies = committedArmies
        self.isSurge = isSurge
    }
}