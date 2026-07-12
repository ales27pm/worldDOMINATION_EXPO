import Foundation
import SpriteKit
import UIKit

@MainActor
final class BattleScene: SKScene {
    let backgroundLayer = SKNode()
    let unitLayer = SKNode()
    let effectLayer = SKNode()
    let hudLayer = SKNode()

    private let terrainNode = SKShapeNode(rectOf: CGSize(width: 1600, height: 1000), cornerRadius: 0)
    private let horizonNode = SKShapeNode(rectOf: CGSize(width: 1600, height: 260), cornerRadius: 0)
    private let platformNode = SKShapeNode(ellipseOf: CGSize(width: 520, height: 110))
    private let scanline = SKShapeNode(rectOf: CGSize(width: 1000, height: 2))
    private let divider = SKShapeNode(rectOf: CGSize(width: 2, height: 420))
    private let outcomeLabel = SKLabelNode(fontNamed: "AvenirNext-Bold")
    private let subLabel = SKLabelNode(fontNamed: "AvenirNext-Medium")

    override init(size: CGSize) {
        super.init(size: size)
        scaleMode = .resizeFill
        backgroundColor = .black
        anchorPoint = CGPoint(x: 0.5, y: 0.5)

        addChild(backgroundLayer)
        addChild(unitLayer)
        addChild(effectLayer)
        addChild(hudLayer)

        buildBackground()
        buildOutcomeLayer()
    }

    required init?(coder aDecoder: NSCoder) {
        nil
    }

    func applyEnvironment(_ theme: BattleEnvironmentTheme) {
        terrainNode.fillColor = theme.terrainBaseColor
        horizonNode.fillColor = theme.horizonColor
        platformNode.fillColor = theme.platformColor
        platformNode.strokeColor = theme.platformStrokeColor
        divider.fillColor = theme.dividerColor
        scanline.fillColor = theme.scanlineColor
        outcomeLabel.fontColor = theme.outcomeTitleColor
        subLabel.fontColor = theme.outcomeSubtitleColor

        backgroundLayer.enumerateChildNodes(withName: "ridge") { node, _ in
            guard let ridge = node as? SKShapeNode else { return }
            ridge.fillColor = theme.ridgeColor
        }
    }

    func showOutcome(title: String?, subtitle: String?) {
        outcomeLabel.text = title
        subLabel.text = subtitle

        let targetAlpha: CGFloat = (title == nil && subtitle == nil) ? 0.0 : 1.0

        outcomeLabel.removeAllActions()
        subLabel.removeAllActions()

        outcomeLabel.run(.fadeAlpha(to: targetAlpha, duration: 0.18))
        subLabel.run(.fadeAlpha(to: targetAlpha, duration: 0.18))
    }

    func burst(at position: CGPoint, color: UIColor) {
        let ring = SKShapeNode(circleOfRadius: 22)
        ring.name = "burst"
        ring.strokeColor = color.withAlphaComponent(0.95)
        ring.lineWidth = 3
        ring.glowWidth = 4
        ring.position = position
        ring.alpha = 0.9
        effectLayer.addChild(ring)

        let action = SKAction.group([
            .scale(to: 2.2, duration: 0.22),
            .fadeOut(withDuration: 0.22)
        ])

        ring.run(.sequence([action, .removeFromParent()]))
    }

    private func buildBackground() {
        terrainNode.fillColor = .init(white: 0.07, alpha: 1.0)
        terrainNode.strokeColor = .clear
        backgroundLayer.addChild(terrainNode)

        horizonNode.fillColor = .init(red: 0.05, green: 0.08, blue: 0.11, alpha: 1.0)
        horizonNode.strokeColor = .clear
        horizonNode.position = CGPoint(x: 0, y: 180)
        backgroundLayer.addChild(horizonNode)

        platformNode.fillColor = .init(white: 0.15, alpha: 1.0)
        platformNode.strokeColor = .init(white: 0.28, alpha: 0.5)
        platformNode.position = CGPoint(x: 0, y: -180)
        backgroundLayer.addChild(platformNode)

        for i in -5...5 {
            let ridge = SKShapeNode(rectOf: CGSize(width: 340, height: 130), cornerRadius: 22)
            ridge.name = "ridge"
            ridge.fillColor = .init(red: 0.08, green: 0.11, blue: 0.15, alpha: 1.0)
            ridge.strokeColor = .clear
            ridge.position = CGPoint(x: CGFloat(i) * 140, y: CGFloat(180 + (i % 2) * 18))
            ridge.zRotation = CGFloat(i) * 0.07
            backgroundLayer.addChild(ridge)
        }

        scanline.name = "scanline"
        scanline.fillColor = .cyan.withAlphaComponent(0.14)
        scanline.strokeColor = .clear
        scanline.position = CGPoint(x: 0, y: 30)
        effectLayer.addChild(scanline)

        let move = SKAction.sequence([
            .moveBy(x: 0, y: 100, duration: 2.1),
            .moveBy(x: 0, y: -100, duration: 0.0)
        ])
        scanline.run(.repeatForever(move))

        divider.fillColor = .white.withAlphaComponent(0.06)
        divider.strokeColor = .clear
        divider.position = CGPoint(x: 0, y: -10)
        hudLayer.addChild(divider)
    }

    private func buildOutcomeLayer() {
        outcomeLabel.fontSize = 34
        outcomeLabel.fontColor = .white
        outcomeLabel.alpha = 0
        outcomeLabel.position = CGPoint(x: 0, y: 250)
        hudLayer.addChild(outcomeLabel)

        subLabel.fontSize = 16
        subLabel.fontColor = .white.withAlphaComponent(0.76)
        subLabel.alpha = 0
        subLabel.position = CGPoint(x: 0, y: 220)
        hudLayer.addChild(subLabel)
    }
}