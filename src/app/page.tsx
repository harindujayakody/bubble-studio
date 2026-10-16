import { Editor } from "@/components/editor/editor";
import { readMusicLibrary, readStickerLibrary } from "@/lib/editor/sticker-library";

export default function Home() {
  return <Editor stickers={readStickerLibrary()} music={readMusicLibrary()} />;
}
