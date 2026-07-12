import Foundation

struct TroopComposition: Codable, Hashable {
    var infantry: Int
    var armor: Int
    var artillery: Int

    init(infantry: Int, armor: Int, artillery: Int) {
        self.infantry = max(0, infantry)
        self.armor = max(0, armor)
        self.artillery = max(0, artillery)
    }

    var total: Int {
        infantry + armor + artillery
    }

    var offensivePower: Int {
        infantry + armor * 3 + artillery * 2
    }

    var defensivePower: Int {
        infantry * 2 + armor * 2 + artillery * 2
    }

    var pressureScore: Int {
        offensivePower + defensivePower
    }

    func scaled(toTotal newTotal: Int) -> TroopComposition {
        guard total > 0 else {
            return Self.garrison(total: max(1, newTotal))
        }

        let target = max(1, newTotal)
        let scale = Double(target) / Double(total)

        var newInfantry = max(0, Int(round(Double(infantry) * scale)))
        var newArmor = max(0, Int(round(Double(armor) * scale)))
        var newArtillery = max(0, Int(round(Double(artillery) * scale)))

        var result = TroopComposition(
            infantry: newInfantry,
            armor: newArmor,
            artillery: newArtillery
        )

        let diff = target - result.total
        if diff != 0 {
            newInfantry = max(0, newInfantry + diff)
            result = TroopComposition(
                infantry: newInfantry,
                armor: newArmor,
                artillery: newArtillery
            )
        }

        if result.total == 0 {
            return Self.garrison(total: 1)
        }

        return result
    }

    func committed(_ count: Int) -> TroopComposition {
        guard total > 0 else { return .garrison(total: 1) }
        return scaled(toTotal: min(max(1, count), total))
    }

    func adding(_ other: TroopComposition) -> TroopComposition {
        TroopComposition(
            infantry: infantry + other.infantry,
            armor: armor + other.armor,
            artillery: artillery + other.artillery
        )
    }

    func subtracting(_ other: TroopComposition) -> TroopComposition {
        TroopComposition(
            infantry: max(0, infantry - other.infantry),
            armor: max(0, armor - other.armor),
            artillery: max(0, artillery - other.artillery)
        )
    }

    func removingCommittedLosses(_ committed: Int, victory: Bool) -> TroopComposition {
        let lossFactor = victory ? 0.32 : 0.58
        let rawLoss = max(1, Int(round(Double(committed) * lossFactor)))
        let survivors = max(1, total - rawLoss)
        return scaled(toTotal: survivors)
    }

    static func garrison(total: Int) -> TroopComposition {
        let clamped = max(1, total)
        let armor = max(0, clamped / 6)
        let artillery = max(0, clamped / 8)
        let infantry = max(1, clamped - armor - artillery)

        return TroopComposition(
            infantry: infantry,
            armor: armor,
            artillery: artillery
        )
    }
}