import Foundation

struct CombatUnit: Sendable {
    let playerID: String
    var armies: Int
    let sourceTerritory: TerritoryID
}

enum SameTimeEngine: Sendable {
    typealias DiceRoller = @Sendable (DiceColor) -> Int
    typealias BattleResolution = (
        defenderRemaining: Int,
        attackerResults: [CombatUnit],
        winnerID: String?,
        winnerArmies: Int,
        requiredSpoils: Bool,
        spoilsCombatants: [CombatUnit]
    )

    static func resolveBattle(
        attackers: [CombatUnit],
        defenderArmies: Int,
        roll: DiceRoller = { $0.roll() }
    ) -> BattleResolution {
        var defArm = defenderArmies
        var atk = attackers

        for _ in 0..<100 {
            guard defArm > 0, atk.contains(where: { $0.armies > 0 }) else { break }

            let defDie = DiceColor.forDefender(armies: defArm)
            let defRoll = roll(defDie)

            for i in 0..<atk.count {
                guard atk[i].armies > 0, defArm > 0 else { continue }

                let atkDie = DiceColor.forAttacker(armies: atk[i].armies)
                let atkRoll = roll(atkDie)
                let losses = max(1, min(atkDie.colorValue, defDie.colorValue))

                if atkRoll >= defRoll {
                    defArm = max(0, defArm - losses)
                } else {
                    atk[i].armies = max(0, atk[i].armies - losses)
                }
            }
        }

        if defArm <= 0 {
            let survivors = atk.filter { $0.armies > 0 }
            if survivors.count == 1 {
                return (0, atk, survivors[0].playerID, survivors[0].armies, false, [])
            } else if survivors.count > 1 {
                return (0, atk, nil, 0, true, survivors)
            }
            return (0, atk, nil, 0, false, [])
        }

        return (defArm, atk, nil, 0, false, [])
    }

    static func resolveSpoilsOfWar(_ combatants: [CombatUnit], roll: DiceRoller = { $0.roll() }) -> [CombatUnit] {
        var units = combatants

        for _ in 0..<100 {
            let alive = units.filter { $0.armies > 0 }
            guard alive.count > 1 else { break }

            for i in 0..<units.count {
                guard units[i].armies > 0 else { continue }
                for j in (i+1)..<units.count {
                    guard units[j].armies > 0 else { continue }
                    let d1 = DiceColor.forAttacker(armies: units[i].armies)
                    let d2 = DiceColor.forAttacker(armies: units[j].armies)
                    let r1 = roll(d1)
                    let r2 = roll(d2)
                    let loss = max(1, min(d1.colorValue, d2.colorValue))
                    if r1 >= r2 {
                        units[j].armies = max(0, units[j].armies - loss)
                    } else {
                        units[i].armies = max(0, units[i].armies - loss)
                    }
                }
            }
        }

        return units
    }

    static func resolveBorderClash(
        army1: CombatUnit,
        army2: CombatUnit,
        roll: DiceRoller = { $0.roll() }
    ) -> (winnerID: String, winnerArmies: Int, loserTerritory: TerritoryID)? {
        var a1 = army1.armies
        var a2 = army2.armies

        for _ in 0..<100 {
            guard a1 > 0, a2 > 0 else { break }
            let d1 = DiceColor.forAttacker(armies: a1)
            let d2 = DiceColor.forAttacker(armies: a2)
            let r1 = roll(d1)
            let r2 = roll(d2)
            let loss = max(1, min(d1.colorValue, d2.colorValue))
            if r1 >= r2 {
                a2 = max(0, a2 - loss)
            } else {
                a1 = max(0, a1 - loss)
            }
        }

        if a1 > 0 && a2 <= 0 {
            return (army1.playerID, a1, army2.sourceTerritory)
        } else if a2 > 0 && a1 <= 0 {
            return (army2.playerID, a2, army1.sourceTerritory)
        }
        return nil
    }
}