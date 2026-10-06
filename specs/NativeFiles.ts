import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  zip(sourceDir: string, outPath: string): Promise<void>;
  unzip(zipPath: string, destDir: string): Promise<void>;
  imagesToPdf(imagePaths: Array<string>, outPath: string, spread: boolean, rtl: boolean): Promise<void>;
  shareFile(path: string, mimeType: string, title: string): Promise<void>;
}

export default TurboModuleRegistry.get<Spec>('NativeFiles');
