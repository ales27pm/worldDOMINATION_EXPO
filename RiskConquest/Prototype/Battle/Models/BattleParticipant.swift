import Foundation

struct BattleParticipant: Identifiable, Hashable {
    let id: String
    let side: BattleSide
    let displayName: String
    let unitId: String
    let stats: BattleUnitStats
    var currentHealth: Int

    init(
        id: String,
        side: BattleSide,
        displayName: String,
        unitId: String,
        stats: BattleUnitStats,
        currentHealth: Int? = nil
    ) {
        self.id = id
        self.side = side
        self.displayName = displayName
        self.unitId = unitId
        self.stats = stats
        self.currentHealth = min(currentHealth ?? stats.maxHealth, stats.maxHealth)
    }

    var isAlive: Bool {
        currentHealth > 0
    }

    var healthRatio: Double {
        guard stats.maxHealth > 0 else { return 0 }
        return Double(currentHealth) / Double(stats.maxHealth)
    }

    mutating func applyDamage(_ amount: Int) {
        currentHealth = max(0, currentHealth - max(0, amount))
    }

    mutating func fullyHeal() {
        currentHealth = stats.maxHealth
    }
}