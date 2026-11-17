"""Build original Motion Scribble draft outlines, never derived from another font.
Build-only: Python + fonttools==4.60.2 + brotli==1.2.1 (or compatible).
Run: python scripts/generate-motion-font.py. No browser/runtime dependency.
"""
import math
import re
import unicodedata
from pathlib import Path
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.feaLib.builder import addOpenTypeFeaturesFromString

# Original pen-center drawings, in font coordinates; Q/C are smooth pen bends.
DRAWINGS = {
 'A':(620,'M65 5 L290 700 Q305 735 322 694 L560 8|M139 245 Q320 263 479 245'),
 'B':(590,'M95 5 L88 700 Q470 760 482 545 Q493 425 115 382|M112 380 Q545 436 510 177 Q491 -25 95 5'),
 'C':(610,'M520 615 Q420 746 245 693 C-5 606 2 115 228 31 Q413 -48 535 112'),
 'D':(620,'M92 8 L91 700 C632 770 657 -47 92 8'),
 'E':(550,'M475 696 L94 702 L100 10 L492 22|M108 371 L430 378'),
 'F':(535,'M98 6 L89 700 L480 708|M101 382 L417 390'),
 'G':(640,'M541 609 Q414 748 240 687 C-6 594 17 88 246 26 Q426 -20 540 130 L539 333 L354 328'),
 'H':(635,'M91 707 L101 5|M535 708 L527 5|M104 362 Q319 382 529 366'),
 'I':(325,'M72 700 L255 706|M164 695 L160 13|M66 9 L256 13'),
 'J':(500,'M151 703 L427 708|M355 701 L349 182 Q340 -85 93 49 L56 123'),
 'K':(590,'M97 705 L101 8|M511 703 L111 342 L529 13'),
 'L':(510,'M99 708 L102 12 L453 22'),
 'M':(790,'M78 6 L102 704 Q110 730 130 682 L389 250 L648 696 Q668 732 676 696 L716 9'),
 'N':(650,'M96 8 L95 695 Q94 717 111 694 L538 13 L538 707'),
 'O':(660,'M330 710 C7 715 5 -3 321 9 C652 -11 650 720 330 710 Z'),
 'P':(575,'M99 8 L95 700 Q505 765 502 509 Q488 304 109 367'),
 'Q':(670,'M331 710 C8 714 8 -8 328 9 C651 -2 653 715 331 710 Z|M370 191 L599 -64'),
 'R':(610,'M100 7 L96 699 Q506 758 502 514 Q498 327 111 368|M307 367 L548 11'),
 'S':(570,'M484 618 Q353 768 174 671 C-101 492 577 386 483 160 Q398 -66 89 70 L58 119'),
 'T':(600,'M52 699 Q304 719 551 700|M304 699 L292 6'),
 'U':(635,'M94 705 L93 244 C80 -70 540 -69 532 241 L537 705'),
 'V':(620,'M64 705 L287 17 Q300 -12 315 19 L557 705'),
 'W':(850,'M63 707 L201 18 Q209 -4 222 19 L420 508 L625 16 Q637 -8 648 20 L783 706'),
 'X':(600,'M77 703 L531 11|M526 705 L68 11'),
 'Y':(610,'M60 704 L302 350 L550 703|M302 350 L302 9'),
 'Z':(580,'M76 694 L502 705 L69 15 L515 21'),
 'a':(540,'M427 396 C308 606 73 451 86 223 C82 -57 405 -29 426 245 L424 490 L430 6'),
 'b':(545,'M99 735 L98 6|M101 283 C103 575 465 570 462 235 C465 -8 212 -58 105 105'),
 'c':(490,'M407 425 C211 619 50 402 80 195 Q111 -66 423 84'),
 'd':(545,'M430 735 L428 6|M424 394 C294 603 65 441 83 220 C75 -48 400 -37 427 242'),
 'e':(510,'M86 250 Q245 234 430 284 C422 616 53 532 82 205 Q109 -48 432 90'),
 'f':(355,'M126 -4 L131 538 Q125 800 310 710|M56 469 L298 476'),
 'g':(550,'M427 410 C302 597 68 456 85 228 C83 -30 416 -17 426 245 L424 488 L427 -55 Q424 -278 135 -161'),
 'h':(550,'M98 739 L101 7|M105 290 C151 585 466 568 448 256 L450 8'),
 'i':(255,'M120 481 L123 7|M119 668 L122 670'),
 'j':(280,'M172 482 L172 -54 Q166 -249 42 -174|M171 669 L174 671'),
 'k':(495,'M99 738 L102 8|M425 488 L112 217 L434 12'),
 'l':(265,'M113 737 L117 93 Q116 1 196 24'),
 'm':(790,'M91 482 L95 8|M97 321 C105 572 378 568 376 273 L378 8|M380 310 C389 571 700 562 686 263 L690 9'),
 'n':(550,'M94 482 L98 8|M100 303 C131 581 463 567 450 260 L453 9'),
 'o':(540,'M273 494 C13 505 17 -2 269 10 C523 0 526 504 273 494 Z'),
 'p':(550,'M99 -205 L98 482|M105 370 C240 591 467 495 464 247 C469 -16 232 -57 102 119'),
 'q':(545,'M429 -205 L426 482|M423 386 C292 591 68 459 82 233 C73 -40 397 -27 425 237'),
 'r':(400,'M97 482 L101 8|M104 281 Q178 582 346 448'),
 's':(470,'M390 428 Q220 584 112 416 C11 249 483 278 374 86 Q267 -61 76 65'),
 't':(370,'M165 669 L167 117 Q168 -30 310 36|M65 478 L310 487'),
 'u':(550,'M96 486 L97 207 C78 -69 409 -54 448 203|M450 486 L452 7'),
 'v':(510,'M65 486 L238 17 Q249 -8 260 19 L446 484'),
 'w':(720,'M61 484 L178 17 L353 361 L536 17 L656 485'),
 'x':(495,'M75 483 L421 12|M423 488 L71 14'),
 'y':(520,'M67 487 L245 51|M453 486 L245 -66 Q199 -221 80 -170'),
 'z':(470,'M74 477 L395 487 L72 19 L407 29'),
 '0':(565,'M282 704 C18 709 21 2 282 10 C545 3 544 707 282 704 Z|M367 575 L191 129'),
 '1':(385,'M70 545 L213 700 L209 13|M90 11 L322 17'),
 '2':(550,'M79 535 C51 789 506 776 464 520 Q443 405 109 116 L73 18 L484 26'),
 '3':(550,'M84 632 Q315 797 459 619 Q515 459 269 375 C561 399 558 88 358 26 Q192 -21 81 80'),
 '4':(560,'M346 700 L67 237 L489 245|M379 698 L375 7'),
 '5':(545,'M470 699 L114 702 L96 398 C441 555 583 176 384 44 Q216 -49 80 73'),
 '6':(550,'M439 649 C182 867 -35 55 261 15 C515 -22 549 430 304 412 Q137 403 94 253'),
 '7':(535,'M69 696 L472 705 Q283 389 185 12'),
 '8':(560,'M280 710 C47 711 49 395 281 397 C519 395 517 713 280 710 Z|M279 397 C5 403 14 10 279 13 C555 8 552 403 279 397 Z'),
 '9':(550,'M110 68 C364 -137 589 651 286 703 C35 744 0 289 248 297 Q413 307 453 457'),
 '.':(250,'M122 36 L124 38'), ',':(250,'M143 51 Q144 -39 88 -103'),
 ':':(250,'M122 377 L124 379|M122 36 L124 38'), ';':(250,'M122 377 L124 379|M143 51 Q144 -39 88 -103'),
 '!':(265,'M133 707 L127 207|M124 35 L127 37'),
 '?':(490,'M68 570 C70 801 451 758 421 557 Q405 462 247 369 L244 208|M242 35 L245 37'),
 '-':(400,'M74 273 L327 280'), '_':(520,'M55 -110 L465 -108'),
 '+':(535,'M76 303 L461 307|M270 506 L266 104'), '=':(535,'M73 392 L465 396|M73 208 L465 213'),
 '/':(425,'M65 -80 L365 754'), '\\':(425,'M67 751 L365 -80'),
 '(':(310,'M238 772 Q-39 355 237 -91'), ')':(310,'M76 771 Q352 355 76 -89'),
 '[':(330,'M263 756 L112 756 L112 -67 L267 -67'), ']':(330,'M65 756 L220 756 L220 -67 L65 -67'),
 '{':(370,'M301 760 Q130 771 182 512 Q192 375 69 345 Q191 328 178 160 Q125 -78 303 -71'),
 '}':(370,'M69 760 Q240 771 188 512 Q178 375 301 345 Q179 328 192 160 Q245 -78 67 -71'),
 "'":(240,'M127 705 L114 532'), '"':(370,'M121 707 L109 535|M261 708 L251 534'),
 '#':(640,'M259 706 L155 9|M483 706 L380 10|M88 461 L559 465|M68 243 L539 249'),
 '$':(570,'M482 611 Q353 753 178 656 C-84 491 571 384 482 160 Q397 -54 86 73|M303 803 L273 -91'),
 '%':(690,'M95 12 L590 706|M199 707 C33 710 39 409 202 409 C367 402 368 710 199 707 Z|M495 304 C329 306 334 5 498 6 C661 1 661 310 495 304 Z'),
 '&':(690,'M593 287 Q490 -5 271 15 C-4 27 23 279 233 395 C565 588 453 762 292 697 C60 602 259 376 616 14'),
 '*':(440,'M224 710 L217 362|M72 621 L376 450|M73 451 L376 623'),
 '@':(790,'M514 460 C292 615 222 328 305 238 Q392 149 495 320 L514 473 L505 221 Q713 161 685 421 C672 744 149 782 96 402 C23 -21 525 -74 660 37'),
 '^':(490,'M81 465 L246 697 L410 462'), '`':(290,'M87 740 L207 612'),
 '~':(550,'M75 292 C192 437 309 167 477 313'), '|':(230,'M114 789 L114 -107'),
 '<':(520,'M425 526 L87 300 L426 79'), '>':(520,'M89 526 L425 300 L87 79'),
 '€':(600,'M514 619 C265 840 99 576 111 347 C95 94 283 -90 518 103|M55 411 L403 417|M56 273 L370 279'),
 '£':(550,'M455 643 Q212 831 185 524 L200 110 L87 20 L468 31|M75 320 L371 325'),
 '×':(520,'M100 483 L426 112|M426 483 L100 112'), '÷':(520,'M79 302 L447 307|M265 515 L267 517|M265 95 L267 97'),
 '°':(330,'M166 735 C19 740 19 497 164 498 C311 492 309 741 166 735 Z'),
 '→':(800,'M66 332 L728 339|M507 569 L737 338 L512 96'),
 '←':(800,'M732 332 L72 339|M291 569 L61 338 L286 96'),
 '↑':(600,'M300 20 L302 700|M83 474 L302 710 L531 472'),
 '↓':(600,'M300 702 L302 29|M83 257 L302 18 L531 259'),
 '✓':(690,'M79 309 L261 92 L605 628'),
 '✦':(740,'M365 715 Q403 384 670 346 Q400 300 369 12 Q329 299 64 345 Q323 388 365 715 Z'),
 '♥':(740,'M369 35 C298 128 -41 389 114 589 Q247 737 370 527 Q503 737 631 589 C778 393 441 125 369 35 Z'),
}
DRAWINGS['·']=(250,'M122 302 L124 304')
DRAWINGS['−']=(535,'M76 303 L461 307')
DRAWINGS['–']=(650,'M66 273 L580 280')
DRAWINGS['—']=(890,'M66 273 L823 281')
DRAWINGS['…']=(650,'M108 36 L110 38|M321 36 L323 38|M534 36 L536 38')
DRAWINGS['’']=(240,'M141 715 Q146 617 88 559')
DRAWINGS['‘']=(240,'M157 729 Q82 667 110 568')
DRAWINGS['”']=(400,DRAWINGS['’'][1]+'|M301 715 Q306 617 248 559')
DRAWINGS['“']=(400,DRAWINGS['‘'][1]+'|M317 729 Q242 667 270 568')
DRAWINGS['ß']=(565,'M99 8 L99 475 C93 789 459 779 447 570 Q446 472 309 398 C611 328 518 -49 271 35')
DRAWINGS['ı']=(255,'M120 481 L123 7')
DRAWINGS['ø']=(540,DRAWINGS['o'][1]+'|M78 -25 L464 532')
DRAWINGS['Ø']=(660,DRAWINGS['O'][1]+'|M84 -29 L574 750')
DRAWINGS['¡']=(265,'M127 483 L130 485|M132 307 L125 -194')
DRAWINGS['¿']=(490,'M241 480 L244 482|M243 307 L241 147 Q80 54 67 -32 C38 -235 422 -277 421 -63')


# Revision 02: looser pen gestures and visible, readable handwritten forms.
DRAWINGS.update({
 'a':(550,'M415 391 C319 536 116 505 99 276 C77 49 270 -31 404 161|M416 472 Q400 231 413 68 Q427 -10 502 43'),
 'e':(530,'M89 225 Q333 221 420 349 C458 529 140 559 91 318 C17 20 318 -58 465 116'),
 'h':(555,'M102 10 Q125 380 97 730|M109 289 C171 568 480 551 454 226 Q443 57 484 26'),
 'l':(290,'M95 39 Q215 259 230 575 C248 835 61 752 93 529 L119 104 Q127 -19 245 29'),
 'n':(555,'M94 8 Q107 256 92 476|M102 310 C170 565 468 568 448 219 Q430 37 482 19'),
 'o':(540,'M294 493 C484 521 530 244 394 70 C262 -80 59 19 85 195 C60 416 192 525 294 493 Z'),
 'r':(410,'M91 7 Q100 301 100 471|M103 281 Q172 529 271 478 L348 411'),
 's':(475,'M396 432 Q235 560 129 427 C15 260 478 252 365 77 Q264 -54 80 78'),
 't':(375,'M171 660 Q161 378 162 137 Q157 -20 310 41|M57 463 Q208 483 331 469'),
 'u':(555,'M95 484 Q112 339 94 213 C66 -59 410 -30 445 231|M452 484 Q428 232 452 67 Q455 8 497 29'),
 'y':(525,'M69 479 Q134 216 244 81|M452 478 L301 30 Q232 -275 84 -166 Q50 -78 247 -33'),
})
ALT_DRAWINGS={
 'a':(530,'M410 405 C270 564 62 409 88 202 Q108 -49 397 152|M423 487 Q395 232 423 21'),
 'e':(515,'M89 254 Q296 217 423 314 C437 565 107 559 84 267 Q57 4 426 70'),
 'l':(265,'M110 735 Q122 410 112 113 Q107 -10 210 39'),
}
ALTERNATES='aelnorstuy'


def paths(data):
    """Flatten our small SVG-like pen language; no imported letter outlines."""
    result=[]
    for source in data.split('|'):
        tokens=re.findall(r'[MLQCZ]|-?\d+(?:\.\d+)?',source)
        points=[];i=0
        while i<len(tokens):
            command=tokens[i];i+=1
            if command=='Z':points.append(points[0]);continue
            count={'M':2,'L':2,'Q':4,'C':6}[command]
            values=list(map(float,tokens[i:i+count]));i+=count
            if command in ('M','L'):points.append(tuple(values));continue
            start=points[-1]
            for j in range(1,13):
                t=j/12;u=1-t
                if command=='Q':p=tuple(u*u*start[k]+2*u*t*values[k]+t*t*values[2+k] for k in (0,1))
                else:p=tuple(u**3*start[k]+3*u*u*t*values[k]+3*u*t*t*values[2+k]+t**3*values[4+k] for k in (0,1))
                points.append(p)
        result.append(points)
    return result


def signed_area(points):
    return sum(a[0]*b[1]-b[0]*a[1] for a,b in zip(points,points[1:]+points[:1]))/2


def outline(pen,points,clockwise=True):
    if len(points)<3:return
    if (signed_area(points)<0)!=clockwise:points=list(reversed(points))
    pen.moveTo(tuple(round(v) for v in points[0]))
    for point in points[1:]:pen.lineTo(tuple(round(v) for v in point))
    pen.closePath()


def stroke(pen,original,radius,seed):
    closed=len(original)>2 and original[0]==original[-1]
    points=original[:-1] if closed else original
    # Sample long pen strokes before adding pressure and slight organic bends.
    sampled=[]
    for a,b in zip(points,points[1:]):
        steps=max(1,math.ceil(math.dist(a,b)/100))
        sampled.extend((a[0]+(b[0]-a[0])*t/steps,a[1]+(b[1]-a[1])*t/steps) for t in range(steps))
    sampled.append(points[-1]);points=sampled
    points=[(x+3.3*math.sin((x+y)/91+seed),y+2.4*math.sin(x/128+seed)) for x,y in points]
    # Short repeated strokes make ink dots rather than disappearing contours.
    if len(points)<2 or math.dist(points[0],points[-1])<5 and not closed:
        x,y=points[0];outline(pen,[(x+radius*math.cos(t*math.tau/16),y+radius*math.sin(t*math.tau/16)) for t in range(16)]);return
    left=[];right=[];normals=[];radii=[]
    for i,(x,y) in enumerate(points):
        prev=points[(i-1)%len(points)] if closed or i else points[0]
        nex=points[(i+1)%len(points)] if closed or i<len(points)-1 else points[-1]
        tx,ty=nex[0]-prev[0],nex[1]-prev[1];length=math.hypot(tx,ty) or 1
        nx,ny=-ty/length,tx/length
        taper=1 if closed else .78+.22*math.sin(math.pi*i/max(1,len(points)-1))
        r=radius*(.85+.24*abs(ty/length)+.09*math.sin(i*.47+seed))*taper
        radii.append(r)
        left.append((x+nx*r,y+ny*r));right.append((x-nx*r,y-ny*r));normals.append(math.atan2(ny,nx))
    if closed:
        rings=sorted([left,right],key=lambda p:abs(signed_area(p)),reverse=True)
        outline(pen,rings[0]);outline(pen,rings[1],False)
    else:
        x,y=points[-1];a=normals[-1];end=[(x+radii[-1]*math.cos(a-math.pi*t/8),y+radii[-1]*math.sin(a-math.pi*t/8)) for t in range(1,8)]
        x,y=points[0];a=normals[0];start=[(x+radii[0]*math.cos(a-math.pi-math.pi*t/8),y+radii[0]*math.sin(a-math.pi-math.pi*t/8)) for t in range(1,8)]
        outline(pen,left+end+list(reversed(right))+start)


ACCENTS={
 '\u0301':'M-50 55 L65 161', '\u0300':'M-65 163 L47 55',
 '\u0302':'M-109 57 L0 151 L109 59',
 '\u0308':'M-91 112 L-89 114|M89 112 L91 114',
 '\u0303':'M-120 83 Q-65 170 0 104 Q70 39 126 132',
 '\u030a':'M0 187 C-112 189 -113 15 0 19 C114 13 112 189 0 187 Z',
 '\u0327':'M12 -36 L-29 -112 Q123 -120 62 -190 Q14 -233 -50 -199',
}


def glyph_drawing(char):
    if char in DRAWINGS:
        width,data=DRAWINGS[char];return width,paths(data)
    if char in (' ','\u00a0'):return 315,[]
    parts=unicodedata.normalize('NFD',char)
    if len(parts)==2 and parts[0] in DRAWINGS and parts[1] in ACCENTS:
        width,base=DRAWINGS[parts[0]];base_paths=paths(base)
        if parts[0]=='i':base_paths=paths(DRAWINGS['ı'][1])
        baseline=0 if parts[1]=='\u0327' else 710 if parts[0].isupper() else 495
        marks=[[(x+width/2,y+baseline) for x,y in path] for path in paths(ACCENTS[parts[1]])]
        return width,base_paths+marks
    return None


def build(weight,radius):
    chars=set(DRAWINGS)|{' ','\u00a0'}
    chars.update(chr(n) for n in range(0xc0,0x180) if glyph_drawing(chr(n)))
    chars=sorted(chars,key=ord)
    names={char:f'uni{ord(char):04X}' for char in chars}
    order=['.notdef']+[names[c] for c in chars]+[names[c]+'.alt' for c in ALTERNATES]
    builder=FontBuilder(1000,isTTF=True);builder.setupGlyphOrder(order)
    builder.setupCharacterMap({ord(c):names[c] for c in chars})
    glyphs={};metrics={}
    for char,alternate in [('\ufffd',False)]+[(c,False) for c in chars]+[(c,True) for c in ALTERNATES]:
        name=names.get(char,'.notdef')+('.alt' if alternate else '')
        drawing=(ALT_DRAWINGS[char][0],paths(ALT_DRAWINGS[char][1])) if alternate and char in ALT_DRAWINGS else glyph_drawing(char)
        width,lines=drawing or (600,paths('M88 8 L88 700 L510 700 L510 8 Z|M178 105 L414 592'))
        pen=TTGlyphPen(None)
        # Whole-letter gesture: varied lean, width, height and a small baseline lift.
        seed=ord(char)*.79+(2.7 if alternate else 0)
        written=char.isalpha()
        sx=1+(.038*math.sin(seed) if written else 0)
        sy=1+(.027*math.cos(seed*.73) if written else 0)
        lean=.065+(.035*math.sin(seed*.43) if written else 0)
        lift=11*math.sin(seed*.61) if written else 0
        advance=round(width*sx+(13*math.sin(seed*.91) if written else 0))
        for index,line in enumerate(lines):
            transformed=[((x-width/2)*sx+width/2+lean*y,y*sy+lift) for x,y in line]
            stroke(pen,transformed,radius,ord(char)*.017+index+(1.7 if alternate else 0))
        glyph=pen.glyph();glyphs[name]=glyph
        if glyph.numberOfContours>0:glyph.flags[0]|=0x40
        metrics[name]=(advance,0)
    builder.setupGlyf(glyphs)
    metrics={name:(advance,getattr(glyphs[name],'xMin',0)) for name,(advance,_) in metrics.items()}
    builder.setupHorizontalMetrics(metrics);builder.setupHorizontalHeader(ascent=1010,descent=-300,lineGap=0)
    style='Bold' if weight==700 else 'Regular'
    builder.setupNameTable({'familyName':'Motion Scribble','styleName':style,'uniqueFontIdentifier':f'MotionPlay:MotionScribble-{style}:0.2','fullName':f'Motion Scribble {style}','psName':f'MotionScribble-{style}','version':'Version 0.200','copyright':'Copyright 2026 Motion Play contributors. Original glyph drawings.','licenseDescription':'MIT License; see MOTION-SCRIBBLE-LICENSE.txt.'})
    builder.setupOS2(sTypoAscender=1010,sTypoDescender=-300,sTypoLineGap=0,usWinAscent=1010,usWinDescent=300,sxHeight=495,sCapHeight=710,usWeightClass=weight,fsSelection=0x20 if weight==700 else 0x40)
    builder.setupPost();builder.setupHead(macStyle=1 if weight==700 else 0)
    pairs=[('A','V',-40),('A','W',-35),('T','o',-45),('T','a',-40),('T','e',-35),('Y','o',-40),('P','a',-25),('W','a',-15)]
    feature='feature kern {\n'+'\n'.join(f'pos {names[a]} {names[b]} {v};' for a,b,v in pairs)+'\n} kern;'
    # Alternating contextual forms keep repeated letters from looking stamped.
    # Substitute after a base form only; an alternate cannot trigger its neighbor.
    feature+='\n@baseLetters = ['+' '.join(names[c] for c in chars if c.isalpha())+'];\n'
    feature+='@plain = ['+' '.join(names[c] for c in ALTERNATES)+'];\n'
    feature+='@written = ['+' '.join(names[c]+'.alt' for c in ALTERNATES)+'];\n'
    feature+="feature calt { sub @baseLetters @plain' by @written; } calt;"
    addOpenTypeFeaturesFromString(builder.font,feature)
    builder.font['head'].created=builder.font['head'].modified=3877718400
    builder.font.recalcTimestamp=False
    destination=Path(__file__).resolve().parents[1]/'public/fonts';destination.mkdir(exist_ok=True)
    for flavor,extension in [(None,'ttf'),('woff2','woff2')]:
        builder.font.flavor=flavor;target=destination/f'MotionScribble-{style}.{extension}';builder.font.save(target)
        print(f'{target.name}: {target.stat().st_size:,} bytes, {len(chars)} characters')


if __name__=='__main__':
    build(400,30)
    build(700,43)
