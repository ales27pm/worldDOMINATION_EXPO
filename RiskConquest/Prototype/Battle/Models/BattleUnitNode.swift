import Foundation
import SpriteKit

@MainActor
final class BattleUnitNode: SKNode {
    private let spriteNode = SKSpriteNode()
    private let flashNode = SKSpriteNode(color: .white, size: CGSize(width: 100, height: 100))
    private let bank: BattleAnimationBank
    private let textures: [SKTexture]

    init(bank: BattleAnimationBank, textures: [SKTexture]) {
        self.bank = bank
        self.textures = textures
        super.init()

        isUserInteractionEnabled = false
        configureNodes()
    }

    required init?(coder aDecoder: NSCoder) {
        return nil
    }

    func play(sequenceNamed name: String) {
        guard let sequence = bank.sequence(named: name) else { return }

        spriteNode.removeAllActions()
        flashNode.removeAllActions()
        flashNode.alpha = 0

        let actions = sequence.steps.compactMap { step -> SKAction? in
            guard textures.indices.contains(step.frameIndex) else { return nil }
            let texture = textures[step.frameIndex]
            return SKAction.sequence([
                .setTexture(texture, resize: true),
                .wait(forDuration: Double(step.durationMs) / 1000.0)
            ])
        }

        guard !actions.isEmpty else { return }

        let sequenceAction = SKAction.sequence(actions)

        if sequence.loop {
            spriteNode.run(.repeatForever(sequenceAction), withKey: "sequence")
        } else {
            spriteNode.run(sequenceAction, withKey: "sequence")
        }

        if name == "attack" {
            runAttackFlash()
        } else if name == "impact" {
            runImpactPulse()
        } else if name == "die" {
            runDeathFade()
        } else {
            alpha = 1.0
            setScale(1.0)
        }
    }

    private func configureNodes() {
        spriteNode.anchorPoint = CGPoint(x: 0.5, y: 0.35)
        spriteNode.texture = textures.first
        spriteNode.size = CGSize(width: 96, height: 96)
        addChild(spriteNode)

        flashNode.alpha = 0
        flashNode.blendMode = .add
        addChild(flashNode)
    }

    private func runAttackFlash() {
        let up = SKAction.fadeAlpha(to: 0.35, duration: 0.06)
        let down = SKAction.fadeOut(withDuration: 0.12)
        flashNode.run(.sequence([up, down]))
    }

    private func runImpactPulse() {
        removeAction(forKey: "impactPulse")
        let pulse = SKAction.sequence([
            .scale(to: 1.08, duration: 0.05),
            .scale(to: 1.0, duration: 0.08)
        ])
        run(pulse, withKey: "impactPulse")
    }

    private func runDeathFade() {
        removeAction(forKey: "deathFade")
        let fade = SKAction.fadeAlpha(to: 0.18, duration: 0.35)
        let shrink = SKAction.scale(to: 0.9, duration: 0.35)
        run(.group([fade, shrink]), withKey: "deathFade")
    }
}