import Foundation

struct BattleAudioCue: Codable, Hashable {
    let introSFX: String?
    let loopMusic: String?
    let victorySFX: String?
    let defeatSFX: String?

    init(
        introSFX: String? = nil,
        loopMusic: String? = nil,
        victorySFX: String? = nil,
        defeatSFX: String? = nil
    ) {
        self.introSFX = introSFX
        self.loopMusic = loopMusic
        self.victorySFX = victorySFX
        self.defeatSFX = defeatSFX
    }
}