import Foundation

struct DiceRoll: Identifiable, Sendable {
    let id = UUID()
    let value: Int
    let isAttacker: Bool
}

struct BattleResult: Sendable {
    let attackerDice: [Int]
    let defenderDice: [Int]
    let attackerLosses: Int
    let defenderLosses: Int
    let territoryConquered: Bool
    let attackerDiceColor: DiceColor?
    let defenderDiceColor: DiceColor?

    init(attackerDice: [Int], defenderDice: [Int], attackerLosses: Int, defenderLosses: Int,
         territoryConquered: Bool, attackerDiceColor: DiceColor? = nil, defenderDiceColor: DiceColor? = nil) {
        self.attackerDice = attackerDice
        self.defenderDice = defenderDice
        self.attackerLosses = attackerLosses
        self.defenderLosses = defenderLosses
        self.territoryConquered = territoryConquered
        self.attackerDiceColor = attackerDiceColor
        self.defenderDiceColor = defenderDiceColor
    }
}

struct SameTimeBattleResult: Identifiable, Sendable {
    let id = UUID()
    let territory: TerritoryID
    let battleType: SameTimeBattleType
    let attackerResults: [AttackResult]
    let defenderPlayerID: String
    let defenderArmiesBefore: Int
    let defenderLosses: Int
    let newOwnerID: String?
}

enum SameTimeBattleType: String, Sendable {
    case standard
    case borderClash
    case massInvasion
    case spoilsOfWar
    case surge
}

struct AttackResult: Identifiable, Sendable {
    let id = UUID()
    let playerID: String
    let sourceTerritory: TerritoryID
    let armiesCommitted: Int
    let diceColor: DiceColor
    let roll: Int
    let losses: Int
    let won: Bool
}