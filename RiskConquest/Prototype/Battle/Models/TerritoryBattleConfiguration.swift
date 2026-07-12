import Foundation

struct TerritoryBattleConfiguration {
    let territory: TerritoryID
    let attackerTemplate: BattleUnitTemplate
    let defenderTemplate: BattleUnitTemplate
    let paletteSet: BattlePaletteSet
    let environment: BattleEnvironmentTheme
    let audio: BattleAudioCue
}