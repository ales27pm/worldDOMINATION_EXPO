import Foundation
import SpriteKit
import UIKit

enum BattleTextureFactory {
    static func makePrototypeTextures(
        frameCount: Int,
        size: CGSize = CGSize(width: 96, height: 96),
        bodyColor: UIColor,
        visorColor: UIColor,
        weaponColor: UIColor
    ) -> [SKTexture] {
        (0..<frameCount).map { index in
            let image = UIGraphicsImageRenderer(size: size).image { ctx in
                let cg = ctx.cgContext
                let rect = CGRect(origin: .zero, size: size)

                UIColor.clear.setFill()
                cg.fill(rect)

                drawShadow(in: cg, rect: rect, index: index)
                drawBody(in: cg, rect: rect, index: index, bodyColor: bodyColor)
                drawWeapon(in: cg, rect: rect, index: index, weaponColor: weaponColor)
                drawHelmet(in: cg, rect: rect, index: index, visorColor: visorColor)
                drawPulse(in: cg, rect: rect, index: index, accentColor: visorColor)
            }

            let texture = SKTexture(image: image)
            texture.filteringMode = .nearest
            return texture
        }
    }

    private static func drawShadow(in cg: CGContext, rect: CGRect, index: Int) {
        let stretch = CGFloat(index % 3) * 3
        let baseY = rect.midY + 24
        let shadowRect = CGRect(x: rect.midX - 18 - stretch * 0.25, y: baseY, width: 36 + stretch, height: 10)
        cg.setFillColor(UIColor.black.withAlphaComponent(0.25).cgColor)
        cg.fillEllipse(in: shadowRect)
    }

    private static func drawBody(in cg: CGContext, rect: CGRect, index: Int, bodyColor: UIColor) {
        let shift = CGFloat((index % 3) - 1) * 2.5
        let bodyRect = CGRect(x: rect.midX - 12 + shift, y: rect.midY - 4, width: 24, height: 30)
        cg.setFillColor(bodyColor.cgColor)
        let bodyPath = UIBezierPath(roundedRect: bodyRect, cornerRadius: 8)
        cg.addPath(bodyPath.cgPath)
        cg.fillPath()

        let torsoRect = CGRect(x: bodyRect.minX + 4, y: bodyRect.minY + 5, width: bodyRect.width - 8, height: 10)
        cg.setFillColor(UIColor.white.withAlphaComponent(0.18).cgColor)
        cg.fill(torsoRect)
    }

    private static func drawWeapon(in cg: CGContext, rect: CGRect, index: Int, weaponColor: UIColor) {
        let attackBias = weaponBias(index: index)
        let start = CGPoint(x: rect.midX + 6, y: rect.midY + 6)
        let end = CGPoint(x: rect.midX + 26 + attackBias, y: rect.midY - 10 - attackBias * 0.2)

        cg.setStrokeColor(weaponColor.cgColor)
        cg.setLineWidth(4)
        cg.setLineCap(.round)
        cg.move(to: start)
        cg.addLine(to: end)
        cg.strokePath()
    }

    private static func drawHelmet(in cg: CGContext, rect: CGRect, index: Int, visorColor: UIColor) {
        let bob = CGFloat((index % 4) - 1) * 1.2
        let helmetRect = CGRect(x: rect.midX - 11, y: rect.midY - 26 + bob, width: 22, height: 18)
        cg.setFillColor(UIColor.darkGray.cgColor)
        cg.fillEllipse(in: helmetRect)

        let visorRect = CGRect(x: helmetRect.minX + 3, y: helmetRect.midY - 2, width: helmetRect.width - 6, height: 4)
        cg.setFillColor(visorColor.withAlphaComponent(0.92).cgColor)
        cg.fill(visorRect)
    }

    private static func drawPulse(in cg: CGContext, rect: CGRect, index: Int, accentColor: UIColor) {
        let pulse = CGFloat(index % 5) / 5.0
        let pulseRect = CGRect(
            x: rect.midX - 20 - pulse * 3,
            y: rect.midY - 20 - pulse * 3,
            width: 40 + pulse * 6,
            height: 40 + pulse * 6
        )
        cg.setStrokeColor(accentColor.withAlphaComponent(0.12 + pulse * 0.18).cgColor)
        cg.setLineWidth(2)
        cg.strokeEllipse(in: pulseRect)
    }

    private static func weaponBias(index: Int) -> CGFloat {
        switch index {
        case 5: return 8
        case 6: return 18
        case 7: return 10
        default: return 0
        }
    }
}