// From the repository root on macOS: osascript -l JavaScript docs/previews/generate-dev-44-og.js
ObjC.import("AppKit");

const root = ObjC.unwrap($.NSFileManager.defaultManager.currentDirectoryPath);
const icon = $.NSImage.alloc.initWithContentsOfFile(`${root}/apps/web/public/icon-512.png`);
if (!icon) throw new Error("Cannot load the source icon");
const bitmap = $.NSBitmapImageRep.alloc
  .initWithBitmapDataPlanesPixelsWidePixelsHighBitsPerSampleSamplesPerPixelHasAlphaIsPlanarColorSpaceNameBytesPerRowBitsPerPixel(
    null, 1200, 630, 8, 4, true, false, $.NSDeviceRGBColorSpace, 0, 0,
  );
const context = $.NSGraphicsContext.graphicsContextWithBitmapImageRep(bitmap);
$.NSGraphicsContext.saveGraphicsState;
$.NSGraphicsContext.setCurrentContext(context);
const transform = $.NSAffineTransform.transform;
transform.translateXByYBy(0, 630);
transform.scaleXByYBy(1, -1);
transform.concat;
$.NSGraphicsContext.setCurrentContext($.NSGraphicsContext.graphicsContextWithCGContextFlipped(context.CGContext, true));

function color(r, g, b) {
  return $.NSColor.colorWithSRGBRedGreenBlueAlpha(r / 255, g / 255, b / 255, 1);
}
$.NSGradient.alloc.initWithStartingColorEndingColor(color(48, 35, 49), color(30, 28, 52))
  .drawFromPointToPointOptions($.NSMakePoint(0, 0), $.NSMakePoint(1200, 630), 0);

$.NSGraphicsContext.saveGraphicsState;
const rect = $.NSMakeRect(60, 95, 440, 440);
$.NSBezierPath.bezierPathWithRoundedRectXRadiusYRadius(rect, 96, 96).addClip;
icon.drawInRectFromRectOperationFractionRespectFlippedHints(
  rect, $.NSZeroRect, $.NSCompositingOperationSourceOver, 1, true, $.NSDictionary.alloc.init,
);
$.NSGraphicsContext.restoreGraphicsState;

function text(value, x, y, size, bold) {
  const font = $.NSFont.fontWithNameSize(bold ? "AppleSDGothicNeo-Bold" : "AppleSDGothicNeo-Regular", size);
  if (!font) throw new Error("Apple SD Gothic Neo is required");
  const attributes = $.NSMutableDictionary.alloc.init;
  attributes.setObjectForKey(font, $.NSFontAttributeName);
  attributes.setObjectForKey(bold ? color(255, 244, 227) : color(230, 217, 204), $.NSForegroundColorAttributeName);
  $(value).drawAtPointWithAttributes($.NSMakePoint(x, y), attributes);
}
text("온설", 560, 186, 96, true);
text("짧은 위로 요청과 담백한 답장을", 566, 332, 30, false);
text("주고받는 서비스", 566, 380, 30, false);
$.NSGraphicsContext.restoreGraphicsState;

const png = bitmap.representationUsingTypeProperties($.NSBitmapImageFileTypePNG, $.NSDictionary.alloc.init);
if (!png.writeToFileAtomically(`${root}/apps/web/public/og-image.png`, true)) {
  throw new Error("Cannot write the OG image");
}
