import { Editor } from "@/components/editor/editor";
import { readStickerLibrary } from "@/lib/editor/sticker-library";

export default function Home() {
  return <Editor stickers={readStickerLibrary()} />;
}
