import Foundation

enum BattleAnimationBankFactory {
    static func makePrototypeBank(unitId: String) -> BattleAnimationBank {
        let frameSize = 96

        let frames: [SpriteFrameDefinition] = [
            SpriteFrameDefinition(id: 0, atlasName: unitId, x: 0, y: 0, width: frameSize, height: frameSize, pivotX: 48, pivotY: 62),
            SpriteFrameDefinition(id: 1, atlasName: unitId, x: 96, y: 0, width: frameSize, height: frameSize, pivotX: 48, pivotY: 62),
            SpriteFrameDefinition(id: 2, atlasName: unitId, x: 192, y: 0, width: frameSize, height: frameSize, pivotX: 48, pivotY: 62),
            SpriteFrameDefinition(id: 3, atlasName: unitId, x: 288, y: 0, width: frameSize, height: frameSize, pivotX: 48, pivotY: 62),
            SpriteFrameDefinition(id: 4, atlasName: unitId, x: 384, y: 0, width: frameSize, height: frameSize, pivotX: 48, pivotY: 62),
            SpriteFrameDefinition(id: 5, atlasName: unitId, x: 480, y: 0, width: frameSize, height: frameSize, pivotX: 48, pivotY: 62),
            SpriteFrameDefinition(id: 6, atlasName: unitId, x: 576, y: 0, width: frameSize, height: frameSize, pivotX: 48, pivotY: 62),
            SpriteFrameDefinition(id: 7, atlasName: unitId, x: 672, y: 0, width: frameSize, height: frameSize, pivotX: 48, pivotY: 62),
            SpriteFrameDefinition(id: 8, atlasName: unitId, x: 768, y: 0, width: frameSize, height: frameSize, pivotX: 48, pivotY: 62),
            SpriteFrameDefinition(id: 9, atlasName: unitId, x: 864, y: 0, width: frameSize, height: frameSize, pivotX: 48, pivotY: 62),
            SpriteFrameDefinition(id: 10, atlasName: unitId, x: 960, y: 0, width: frameSize, height: frameSize, pivotX: 48, pivotY: 62),
            SpriteFrameDefinition(id: 11, atlasName: unitId, x: 1056, y: 0, width: frameSize, height: frameSize, pivotX: 48, pivotY: 62)
        ]

        let sequences: [UnitAnimationSequence] = [
            UnitAnimationSequence(
                name: "idle",
                steps: [
                    UnitAnimationStep(frameIndex: 0, durationMs: 110),
                    UnitAnimationStep(frameIndex: 1, durationMs: 110),
                    UnitAnimationStep(frameIndex: 2, durationMs: 110),
                    UnitAnimationStep(frameIndex: 1, durationMs: 110)
                ],
                loop: true
            ),
            UnitAnimationSequence(
                name: "prepare",
                steps: [
                    UnitAnimationStep(frameIndex: 3, durationMs: 90),
                    UnitAnimationStep(frameIndex: 4, durationMs: 90)
                ],
                loop: false
            ),
            UnitAnimationSequence(
                name: "attack",
                steps: [
                    UnitAnimationStep(frameIndex: 5, durationMs: 70),
                    UnitAnimationStep(frameIndex: 6, durationMs: 70),
                    UnitAnimationStep(frameIndex: 7, durationMs: 70)
                ],
                loop: false
            ),
            UnitAnimationSequence(
                name: "impact",
                steps: [
                    UnitAnimationStep(frameIndex: 8, durationMs: 80),
                    UnitAnimationStep(frameIndex: 9, durationMs: 110)
                ],
                loop: false
            ),
            UnitAnimationSequence(
                name: "recover",
                steps: [
                    UnitAnimationStep(frameIndex: 4, durationMs: 90),
                    UnitAnimationStep(frameIndex: 2, durationMs: 90)
                ],
                loop: false
            ),
            UnitAnimationSequence(
                name: "die",
                steps: [
                    UnitAnimationStep(frameIndex: 10, durationMs: 120),
                    UnitAnimationStep(frameIndex: 11, durationMs: 180)
                ],
                loop: false
            )
        ]

        return BattleAnimationBank(
            unitId: unitId,
            frames: frames,
            sequences: sequences
        )
    }
}