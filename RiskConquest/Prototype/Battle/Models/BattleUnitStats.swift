import Foundation

struct BattleUnitStats: Codable, Hashable {
    let maxHealth: Int
    let attack: Int
    let defense: Int
    let initiative: Int
    let minDamage: Int
    let maxDamage: Int

    init(
        maxHealth: Int,
        attack: Int,
        defense: Int,
        initiative: Int,
        minDamage: Int,
        maxDamage: Int
    ) {
        self.maxHealth = max(1, maxHealth)
        self.attack = attack
        self.defense = defense
        self.initiative = initiative
        self.minDamage = max(1, minDamage)
        self.maxDamage = max(self.minDamage, maxDamage)
    }
}