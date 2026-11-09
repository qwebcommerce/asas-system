import { iconSpriteMarkup } from "@/components/icon-sprite-markup";

export function IconSprite() {
  return <div className="icon-sprite" dangerouslySetInnerHTML={{ __html: iconSpriteMarkup }} />;
}
