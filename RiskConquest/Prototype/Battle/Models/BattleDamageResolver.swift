import Foundation

struct BattleDamageOutcome: Hashable {
    let amount: Int
    let isCritical: Bool
    let isLethal: Bool
}

enum BattleDamageResolver {
    static func resolve(attacker: BattleParticipant, defender: BattleParticipant) -> BattleDamageOutcome {
        let rolledBase = Int.random(in: attacker.stats.minDamage...attacker.stats.maxDamage)
        let powerDelta = attacker.stats.attack - defender.stats.defense
        let adjusted = max(1, rolledBase + Int(round(Double(powerDelta) * 0.45)))

        let criticalRoll = Int.random(in: 0..<100)
        let isCritical = criticalRoll < 12

        let critMultiplier = isCritical ? 1.55 : 1.0
        let damage = max(1, Int(round(Double(adjusted) * critMultiplier)))
        let cappedDamage = min(damage, defender.currentHealth)

        return BattleDamageOutcome(
            amount: cappedDamage,
            isCritical: isCritical,
            isLethal: cappedDamage >= defender.currentHealth
        )
    }
}