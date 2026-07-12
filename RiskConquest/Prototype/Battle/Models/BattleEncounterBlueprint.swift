import Foundation

struct BattleEncounterBlueprint: Identifiable {
    let territory: TerritoryID
    let attackerOrigin: TerritoryID
    let defenderTerritory: TerritoryID
    let attackerFaction: FactionID
    let defenderFaction: FactionID
    let attacker: BattleParticipant
    let defender: BattleParticipant
    let paletteSet: BattlePaletteSet
    let environment: BattleEnvironmentTheme
    let audio: BattleAudioCue
    let odds: BattleOddsEstimate
    let committedAttackerTroops: Int
    let committedDefenderTroops: Int

    var id: String {
        "\(attackerOrigin.rawValue)->\(defenderTerritory.rawValue)"
    }
}