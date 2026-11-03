import { iconSpriteMarkup } from "@/components/icon-sprite-markup";

export function IconSprite() {
  return <div hidden dangerouslySetInnerHTML={{ __html: iconSpriteMarkup }} />;
}
