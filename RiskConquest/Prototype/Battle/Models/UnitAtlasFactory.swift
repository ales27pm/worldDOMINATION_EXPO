import Foundation
import UIKit

enum UnitAtlasFactory {
    static func makePrototypeAtlas(
        frameCount: Int,
        palette: UnitAtlasPalette,
        frameSize: CGSize = CGSize(width: 96, height: 96)
    ) -> UIImage {
        let atlasSize = CGSize(width: frameSize.width * CGFloat(frameCount), height: frameSize.height)

        let renderer = UIGraphicsImageRenderer(size: atlasSize)
        return renderer.image { ctx in
            let cg = ctx.cgContext
            cg.setFillColor(UIColor.clear.cgColor)
            cg.fill(CGRect(origin: .zero, size: atlasSize))

            for frameIndex in 0..<frameCount {
                let originX = CGFloat(frameIndex) * frameSize.width
                let frameRect = CGRect(x: originX, y: 0, width: frameSize.width, height: frameSize.height)

                drawFrame(
                    in: cg,
                    rect: frameRect,
                    frameIndex: frameIndex,
                    palette: palette
                )
            }
        }
    }

    private static func drawFrame(
        in cg: CGContext,
        rect: CGRect,
        frameIndex: Int,
        palette: UnitAtlasPalette
    ) {
        drawShadow(in: cg, rect: rect, frameIndex: frameIndex)
        drawBody(in: cg, rect: rect, frameIndex: frameIndex, color: palette.bodyColor)
        drawWeapon(in: cg, rect: rect, frameIndex: frameIndex, color: palette.weaponColor)
        drawHelmet(in: cg, rect: rect, frameIndex: frameIndex, visorColor: palette.visorColor)
        drawPulse(in: cg, rect: rect, frameIndex: frameIndex, accentColor: palette.visorColor)
    }

    private static func drawShadow(in cg: CGContext, rect: CGRect, frameIndex: Int) {
        let stretch = CGFloat(frameIndex % 3) * 3
        let baseY = rect.midY + 24
        let shadowRect = CGRect(
            x: rect.midX - 18 - stretch * 0.25,
            y: baseY,
            width: 36 + stretch,
            height: 10
        )
        cg.setFillColor(UIColor.black.withAlphaComponent(0.25).cgColor)
        cg.fillEllipse(in: shadowRect)
    }

    private static func drawBody(
        in cg: CGContext,
        rect: CGRect,
        frameIndex: Int,
        color: UIColor
    ) {
        let shift = CGFloat((frameIndex % 3) - 1) * 2.5
        let bodyRect = CGRect(x: rect.midX - 12 + shift, y: rect.midY - 4, width: 24, height: 30)

        cg.setFillColor(color.cgColor)
        let bodyPath = UIBezierPath(roundedRect: bodyRect, cornerRadius: 8)
        cg.addPath(bodyPath.cgPath)
        cg.fillPath()

        let torsoRect = CGRect(
            x: bodyRect.minX + 4,
            y: bodyRect.minY + 5,
            width: bodyRect.width - 8,
            height: 10
        )
        cg.setFillColor(UIColor.white.withAlphaComponent(0.18).cgColor)
        cg.fill(torsoRect)
    }

    private static func drawWeapon(
        in cg: CGContext,
        rect: CGRect,
        frameIndex: Int,
        color: UIColor
    ) {
        let attackBias = weaponBias(frameIndex: frameIndex)
        let start = CGPoint(x: rect.midX + 6, y: rect.midY + 6)
        let end = CGPoint(
            x: rect.midX + 26 + attackBias,
            y: rect.midY - 10 - attackBias * 0.2
        )

        cg.setStrokeColor(color.cgColor)
        cg.setLineWidth(4)
        cg.setLineCap(.round)
        cg.move(to: start)
        cg.addLine(to: end)
        cg.strokePath()
    }

    private static func drawHelmet(
        in cg: CGContext,
        rect: CGRect,
        frameIndex: Int,
        visorColor: UIColor
    ) {
        let bob = CGFloat((frameIndex % 4) - 1) * 1.2
        let helmetRect = CGRect(x: rect.midX - 11, y: rect.midY - 26 + bob, width: 22, height: 18)

        cg.setFillColor(UIColor.darkGray.cgColor)
        cg.fillEllipse(in: helmetRect)

        let visorRect = CGRect(
            x: helmetRect.minX + 3,
            y: helmetRect.midY - 2,
            width: helmetRect.width - 6,
            height: 4
        )
        cg.setFillColor(visorColor.withAlphaComponent(0.92).cgColor)
        cg.fill(visorRect)
    }

    private static func drawPulse(
        in cg: CGContext,
        rect: CGRect,
        frameIndex: Int,
        accentColor: UIColor
    ) {
        let pulse = CGFloat(frameIndex % 5) / 5.0
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

    private static func weaponBias(frameIndex: Int) -> CGFloat {
        switch frameIndex {
        case 5: return 8
        case 6: return 18
        case 7: return 10
        default: return 0
        }
    }
}