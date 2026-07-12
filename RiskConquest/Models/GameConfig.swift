import Foundation

struct GameConfig: Sendable {
    var sessionType: SessionType = .singlePlayer
    var mode: GameMode = .classic
    var objective: GameObjective = .domination100
    var useExtraTerritories: Bool = false
    var cardTradeRule: CardTradeRule = .ascending
    var territoryAllocation: TerritoryAllocation = .random
    var middleEastEastAfricaConnection: Bool = true

    var totalTerritoryCount: Int {
        useExtraTerritories ? 48 : 42
    }

    var dominationTarget: Int {
        switch objective {
        case .domination60:
            return Int(ceil(Double(totalTerritoryCount) * 0.6))
        case .domination80:
            return Int(ceil(Double(totalTerritoryCount) * 0.8))
        case .domination100:
            return totalTerritoryCount
        default:
            return totalTerritoryCount
        }
    }

    var capitalTargetCount: Int {
        0
    }

    func capitalTarget(playerCount: Int) -> Int {
        switch playerCount {
        case 3...4: return 2
        case 5...6: return 3
        case 7...8: return 4
        default: return 2
        }
    }

    var isDomination: Bool {
        objective == .domination60 || objective == .domination80 || objective == .domination100
    }

    func activeTerritoryIDs() -> [TerritoryID] {
        if useExtraTerritories {
            return TerritoryID.allCases
        }
        return TerritoryID.baseTerritories
    }
}