import Foundation
import SpriteKit
import UIKit

@MainActor
final class BattleCombatantNode: SKNode {
    let side: BattleSide
    let participantID: String

    private let nameLabel = SKLabelNode(fontNamed: "AvenirNext-Bold")
    private let hpLabel = SKLabelNode(fontNamed: "AvenirNext-Medium")
    private let healthBarBackground = SKSpriteNode(color: .darkGray, size: CGSize(width: 110, height: 10))
    private let healthBarFill = SKSpriteNode(color: .systemGreen, size: CGSize(width: 110, height: 10))
    private let unitRoot = SKNode()
    private let unitNode: BattleUnitNode
    private let facingSign: CGFloat

    init(
        participant: BattleParticipant,
        bank: BattleAnimationBank,
        textures: [SKTexture],
        facingRight: Bool
    ) {
        self.side = participant.side
        self.participantID = participant.id
        self.unitNode = BattleUnitNode(bank: bank, textures: textures)
        self.facingSign = facingRight ? 1.0 : -1.0
        super.init()

        configureChrome(participant: participant)
        configureUnit(facingRight: facingRight)
        setHealth(current: participant.currentHealth, max: participant.stats.maxHealth, animated: false)
    }

    required init?(coder aDecoder: NSCoder) {
        return nil
    }

    func transition(to state: BattleUnitStateMachine.State) {
        unitNode.play(sequenceNamed: state.sequenceName)

        switch state {
        case .idle:
            removeAction(forKey: "stance")
            run(.moveTo(y: position.y, duration: 0.08), withKey: "stance")

        case .prepare:
            removeAction(forKey: "stance")
            let lift = SKAction.moveBy(x: 0, y: 6, duration: 0.08)
            let settle = SKAction.moveBy(x: 0, y: -6, duration: 0.08)
            run(.sequence([lift, settle]), withKey: "stance")

        case .attack:
            runAttackLunge()

        case .impact:
            runImpactShake()

        case .recover:
            let recover = SKAction.sequence([
                .moveBy(x: -10 * facingSign, y: 0, duration: 0.06),
                .moveBy(x: 10 * facingSign, y: 0, duration: 0.08)
            ])
            run(recover, withKey: "stance")

        case .die:
            runDeathCollapse()
        }
    }

    func setHealth(current: Int, max maxHealth: Int, animated: Bool) {
        let ratio = maxHealth > 0 ? CGFloat(current) / CGFloat(maxHealth) : 0
        let clampedRatio = Swift.max(0.0, Swift.min(1.0, ratio))
        let targetScale = Swift.max(0.001, clampedRatio)

        hpLabel.text = "HP \(current)/\(maxHealth)"

        let color: UIColor
        if clampedRatio > 0.55 {
            color = .systemGreen
        } else if clampedRatio > 0.25 {
            color = .systemOrange
        } else {
            color = .systemRed
        }

        healthBarFill.color = color

        if animated {
            healthBarFill.removeAction(forKey: "hpScale")
            let action = SKAction.scaleX(to: targetScale, duration: 0.18)
            action.timingMode = .easeOut
            healthBarFill.run(action, withKey: "hpScale")
        } else {
            healthBarFill.xScale = targetScale
        }
    }

    func setDisplayName(_ text: String) {
        nameLabel.text = text
    }

    func setVictoryGlow(enabled: Bool) {
        alpha = enabled ? 1.0 : 0.88
        let scale: CGFloat = enabled ? 1.06 : 1.0
        run(.scale(to: scale, duration: 0.18), withKey: "victoryScale")
    }

    private func configureChrome(participant: BattleParticipant) {
        nameLabel.text = participant.displayName
        nameLabel.fontSize = 18
        nameLabel.fontColor = .white
        nameLabel.horizontalAlignmentMode = .center
        nameLabel.position = CGPoint(x: 0, y: 112)
        addChild(nameLabel)

        hpLabel.text = ""
        hpLabel.fontSize = 13
        hpLabel.fontColor = .white.withAlphaComponent(0.82)
        hpLabel.horizontalAlignmentMode = .center
        hpLabel.position = CGPoint(x: 0, y: 92)
        addChild(hpLabel)

        healthBarBackground.anchorPoint = CGPoint(x: 0.0, y: 0.5)
        healthBarBackground.position = CGPoint(x: -55, y: 76)
        healthBarBackground.alpha = 0.6
        addChild(healthBarBackground)

        healthBarFill.anchorPoint = CGPoint(x: 0.0, y: 0.5)
        healthBarFill.position = CGPoint(x: -55, y: 76)
        addChild(healthBarFill)
    }

    private func configureUnit(facingRight: Bool) {
        unitNode.position = CGPoint(x: 0, y: 0)
        unitNode.xScale = facingRight ? 1.0 : -1.0
        unitRoot.addChild(unitNode)
        addChild(unitRoot)
    }

    private func runAttackLunge() {
        removeAction(forKey: "stance")
        let forward = SKAction.moveBy(x: 18 * facingSign, y: 0, duration: 0.08)
        forward.timingMode = .easeOut
        let back = SKAction.moveBy(x: -18 * facingSign, y: 0, duration: 0.12)
        back.timingMode = .easeInEaseOut
        run(.sequence([forward, back]), withKey: "stance")
    }

    private func runImpactShake() {
        removeAction(forKey: "stance")
        let shake = SKAction.sequence([
            .moveBy(x: -8 * facingSign, y: 0, duration: 0.04),
            .moveBy(x: 12 * facingSign, y: 0, duration: 0.05),
            .moveBy(x: -4 * facingSign, y: 0, duration: 0.04)
        ])
        run(shake, withKey: "stance")
    }

    private func runDeathCollapse() {
        removeAction(forKey: "stance")
        let fall = SKAction.group([
            .rotate(byAngle: facingSign * 0.35, duration: 0.24),
            .moveBy(x: 0, y: -18, duration: 0.24),
            .fadeAlpha(to: 0.28, duration: 0.3)
        ])
        run(fall, withKey: "stance")
    }
}