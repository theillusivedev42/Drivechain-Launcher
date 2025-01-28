const { app } = require("electron");
const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");
const AdmZip = require("adm-zip");
const tar = require("tar");
const { pipeline } = require('stream/promises');

class DownloadManager {
  constructor(mainWindow, config) {
    this.mainWindow = mainWindow;
    this.config = config;
    this.activeDownloads = new Map();
    this.pausedDownloads = new Map();
  }

  startDownload(chainId, url, basePath) {
    if (this.activeDownloads.has(chainId) || this.pausedDownloads.has(chainId))
      return;

    this.activeDownloads.set(chainId, {
      progress: 0,
      status: "downloading",
      downloadedLength: 0,
    });
    this.mainWindow.webContents.send("download-started", { chainId });
    this.downloadAndExtract(chainId, url, basePath);
    this.sendDownloadsUpdate();
  }

  getFileExtension(url) {
    const fileName = url.split('/').pop();
    if (fileName.endsWith('.tar.gz')) return '.tar.gz';
    if (fileName.endsWith('.zip')) return '.zip';
    return '.zip';
  }

  async downloadAndExtract(chainId, url, basePath) {
    const fileExt = this.getFileExtension(url);
    const tempPath = path.join(basePath, `temp_${chainId}${fileExt}`);

    try {
      await this.downloadFile(chainId, url, tempPath);
      
      if (fileExt === '.tar.gz') {
        await this.extractTarGz(chainId, tempPath, basePath);
      } else {
        await this.extractZip(chainId, tempPath, basePath);
      }

      await fs.promises.unlink(tempPath);

      this.activeDownloads.delete(chainId);
      this.sendDownloadsUpdate();
      this.mainWindow.webContents.send("download-complete", { chainId });
    } catch (error) {
      console.error(`Error processing ${chainId}:`, error);
      this.activeDownloads.delete(chainId);
      this.pausedDownloads.delete(chainId);
      this.sendDownloadsUpdate();
      this.mainWindow.webContents.send("download-error", {
        chainId,
        error: error.message,
        stack: error.stack,
      });

      try {
        await fs.promises.unlink(tempPath);
      } catch (unlinkError) {
        console.error(`Failed to delete partial download for ${chainId}:`, unlinkError);
      }
    }
  }

  async extractTarGz(chainId, tarPath, basePath) {
    try {
      await pipeline(
        fs.createReadStream(tarPath),
        tar.x({
          cwd: basePath,
          strip: 0
        })
      );
    } catch (error) {
      console.error(`Error in extractTarGz for ${chainId}: ${error.message}`);
      throw error;
    }
  }

  async downloadFile(chainId, url, zipPath) {
    return new Promise(async (resolve, reject) => {
      const download = this.activeDownloads.get(chainId) || {
        progress: 0,
        downloadedLength: 0,
      };
      this.activeDownloads.set(chainId, download);

      const writer = fs.createWriteStream(zipPath, { flags: "a" });
      let downloadedLength = download.downloadedLength || 0;

      try {
        const cancelSource = axios.CancelToken.source();
        download.cancelSource = cancelSource;

        const { data, headers } = await axios({
          method: "GET",
          url: url,
          responseType: "stream",
          headers: downloadedLength > 0 ? { Range: `bytes=${downloadedLength}-` } : {},
          cancelToken: cancelSource.token,
        });

        const totalLength = parseInt(headers["content-length"], 10) + downloadedLength;

        data.pipe(writer);

        data.on("data", (chunk) => {
          downloadedLength += chunk.length;
          const progress = (downloadedLength / totalLength) * 100;
          this.updateDownloadProgress(chainId, progress, downloadedLength);

          if (this.pausedDownloads.has(chainId)) {
            data.pause();
            writer.end();
          }
        });

        data.on("error", (error) => {
          reject(new Error(`Download error: ${error.message}`));
        });

        writer.on("error", reject);

        writer.on("close", () => {
          if (downloadedLength === totalLength) {
            resolve();
          } else if (!this.pausedDownloads.has(chainId)) {
            reject(new Error(`Incomplete download: expected ${totalLength} bytes, got ${downloadedLength} bytes`));
          } else {
            resolve();
          }
        });
      } catch (error) {
        if (axios.isCancel(error)) {
          console.log("Download canceled:", error.message);
          resolve();
        } else {
          reject(error);
        }
      }
    });
  }

  async extractZip(chainId, zipPath, basePath) {
    return new Promise((resolve, reject) => {
      try {
        // Special handling for macOS app bundles
        if (process.platform === 'darwin' && chainId === 'bitwindow') {
          const { spawn } = require('child_process');
          const ditto = spawn('ditto', ['-xk', zipPath, basePath]);
          
          ditto.stderr.on('data', (data) => {
            console.error(`Ditto stderr: ${data}`);
          });

          ditto.on('close', (code) => {
            if (code === 0) {
              // Set proper permissions for the .app bundle
              const appPath = path.join(basePath, 'bitwindow.app');
              spawn('chmod', ['-R', '+x', appPath])
                .on('close', (chmodCode) => {
                  if (chmodCode === 0) {
                    resolve();
                  } else {
                    reject(new Error(`Failed to set permissions: ${chmodCode}`));
                  }
                });
            } else {
              reject(new Error(`Ditto extraction failed with code: ${code}`));
            }
          });

          ditto.on('error', (error) => {
            reject(new Error(`Ditto error: ${error.message}`));
          });
        } else {
          // Use AdmZip for non-macOS or non-BitWindow extractions
          const zip = new AdmZip(zipPath);
          zip.extractAllToAsync(basePath, true, (error) => {
            if (error) {
              console.error(`Extraction error for ${chainId}: ${error.message}`);
              reject(error);
            } else {
              resolve();
            }
          });
        }
      } catch (error) {
        console.error(`Error in extractZip for ${chainId}: ${error.message}`);
        reject(error);
      }
    });
  }

  async pauseDownload(chainId) {
    const download = this.activeDownloads.get(chainId);
    if (download) {
      if (download.cancelSource) {
        download.cancelSource.cancel("Download paused");
      }
      this.pausedDownloads.set(chainId, download);
      this.activeDownloads.delete(chainId);
      this.updateDownloadProgress(chainId, download.progress, download.downloadedLength, "paused");
      return true;
    }
    return false;
  }

  async resumeDownload(chainId) {
    const download = this.pausedDownloads.get(chainId);
    if (download) {
      this.activeDownloads.set(chainId, download);
      this.pausedDownloads.delete(chainId);
      this.updateDownloadProgress(chainId, download.progress, download.downloadedLength, "downloading");
      return true;
    }
    return false;
  }

  updateDownloadProgress(chainId, progress, downloadedLength, status = "downloading") {
    const download = this.activeDownloads.get(chainId) || this.pausedDownloads.get(chainId);
    if (download) {
      download.progress = progress;
      download.status = status;
      download.downloadedLength = downloadedLength;
      this.sendDownloadsUpdate();
    }
  }

  sendDownloadsUpdate() {
    if (this.mainWindow) {
      const downloadsArray = [...this.activeDownloads.entries(), ...this.pausedDownloads.entries()]
        .map(([chainId, download]) => ({
          chainId,
          displayName: this.config.chains.find(c => c.id === chainId)?.display_name || chainId,
          progress: download.progress,
          status: download.status,
          downloadedLength: download.downloadedLength,
        }));
      this.mainWindow.webContents.send("downloads-update", downloadsArray);
    }
  }

  getDownloads() {
    return [...this.activeDownloads.entries(), ...this.pausedDownloads.entries()]
      .map(([chainId, download]) => ({
        chainId,
        ...download,
      }));
  }
}

module.exports = DownloadManager;
