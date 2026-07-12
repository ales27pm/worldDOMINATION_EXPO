import Foundation

struct BattleAnimationBank: Codable, Hashable {
    let unitId: String
    let frames: [SpriteFrameDefinition]
    let sequences: [UnitAnimationSequence]

    func sequence(named name: String) -> UnitAnimationSequence? {
        sequences.first { $0.name == name }
    }

    func frame(at index: Int) -> SpriteFrameDefinition? {
        guard frames.indices.contains(index) else { return nil }
        return frames[index]
    }
}