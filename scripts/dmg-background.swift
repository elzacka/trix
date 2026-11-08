// Draws assets/dmg-background.tiff: the disk image window's arrow from the app to Applications.
// Run: swift scripts/dmg-background.swift. Positions match the layout in sign.sh.
import AppKit

let size = CGSize(width: 600, height: 400)
let arrowY: CGFloat = 130, fromX: CGFloat = 262, toX: CGFloat = 338

func draw(scale: CGFloat) -> NSBitmapImageRep {
    let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: Int(size.width * scale), pixelsHigh: Int(size.height * scale),
                               bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false,
                               colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
    rep.size = size
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
    let cg = NSGraphicsContext.current!.cgContext
    cg.setFillColor(.white)
    cg.fill(CGRect(origin: .zero, size: size))
    // Finder's coordinates start top left; CoreGraphics' bottom left
    let y = size.height - arrowY
    // 3.3:1 on white, WCAG 1.4.11 for a graphic the user needs
    cg.setStrokeColor(CGColor(srgbRed: 0x8A / 255, green: 0x8A / 255, blue: 0x8E / 255, alpha: 1))
    cg.setLineWidth(3)
    cg.setLineCap(.round)
    cg.setLineJoin(.round)
    cg.move(to: CGPoint(x: fromX, y: y))
    cg.addLine(to: CGPoint(x: toX, y: y))
    cg.move(to: CGPoint(x: toX - 11, y: y + 11))
    cg.addLine(to: CGPoint(x: toX, y: y))
    cg.addLine(to: CGPoint(x: toX - 11, y: y - 11))
    cg.strokePath()
    NSGraphicsContext.restoreGraphicsState()
    return rep
}

let tiff = NSBitmapImageRep.tiffRepresentationOfImageReps(in: [draw(scale: 1), draw(scale: 2)], using: .lzw, factor: 0)!
try! tiff.write(to: URL(fileURLWithPath: "assets/dmg-background.tiff"))
