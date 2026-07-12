import Foundation

struct UnitAnimationStep: Codable, Hashable {
    let frameIndex: Int
    let durationMs: Int
}

struct UnitAnimationSequence: Codable, Hashable {
    let name: String
    let steps: [UnitAnimationStep]
    let loop: Bool
}