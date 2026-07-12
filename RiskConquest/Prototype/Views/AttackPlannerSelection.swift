import Foundation

struct AttackPlannerSelection {
    var origin: TerritoryID?
    var target: TerritoryID?
    var blueprint: BattleEncounterBlueprint?

    var isArmed: Bool {
        origin != nil
    }

    var isReadyToLaunch: Bool {
        blueprint != nil
    }

    var odds: BattleOddsEstimate? {
        blueprint?.odds
    }

    mutating func clear() {
        origin = nil
        target = nil
        blueprint = nil
    }
}