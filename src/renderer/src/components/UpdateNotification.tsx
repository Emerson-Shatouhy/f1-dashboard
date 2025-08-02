import React, { useState, useEffect } from 'react'
import { Download, RefreshCw, X, AlertCircle } from 'lucide-react'

interface UpdateInfo {
  version: string
  releaseNotes?: string
  releaseName?: string
  releaseDate?: string
}

interface ProgressInfo {
  bytesPerSecond: number
  percent: number
  transferred: number
  total: number
}

const UpdateNotification: React.FC = () => {
  const [updateState, setUpdateState] = useState<
    'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'error'
  >('idle')
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
  const [downloadProgress, setDownloadProgress] = useState<ProgressInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Set up update event listeners
    window.api.onUpdateChecking(() => {
      setUpdateState('checking')
      setIsVisible(true)
    })

    window.api.onUpdateAvailable((info: UpdateInfo) => {
      setUpdateState('available')
      setUpdateInfo(info)
      setIsVisible(true)
    })

    window.api.onUpdateNotAvailable(() => {
      setUpdateState('idle')
      setIsVisible(false)
    })

    window.api.onUpdateError((err: any) => {
      setUpdateState('error')
      setError(err.message || 'Update error occurred')
      setIsVisible(true)
    })

    window.api.onUpdateDownloadProgress((progress: ProgressInfo) => {
      setUpdateState('downloading')
      setDownloadProgress(progress)
    })

    window.api.onUpdateDownloaded(() => {
      setUpdateState('downloaded')
      setDownloadProgress(null)
    })
  }, [])

  const handleCheckForUpdates = () => {
    window.api.checkForUpdates()
  }

  const handleRestartAndUpdate = () => {
    window.api.restartAndUpdate()
  }

  const handleDismiss = () => {
    setIsVisible(false)
  }

  if (!isVisible) return null

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 relative">
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
        >
          <X size={16} />
        </button>

        {updateState === 'checking' && (
          <div className="flex items-center space-x-3">
            <RefreshCw className="animate-spin text-blue-500" size={20} />
            <div>
              <h4 className="font-medium text-gray-900">Checking for updates...</h4>
              <p className="text-sm text-gray-600">Please wait while we check for updates.</p>
            </div>
          </div>
        )}

        {updateState === 'available' && updateInfo && (
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Download className="text-green-500" size={20} />
              <h4 className="font-medium text-gray-900">Update Available</h4>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-2">
                Version {updateInfo.version} is available for download.
              </p>
              {updateInfo.releaseNotes && (
                <p className="text-xs text-gray-500 mb-3 max-h-20 overflow-y-auto">
                  {updateInfo.releaseNotes}
                </p>
              )}
              <button
                onClick={handleCheckForUpdates}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
              >
                Download Update
              </button>
            </div>
          </div>
        )}

        {updateState === 'downloading' && downloadProgress && (
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Download className="text-blue-500" size={20} />
              <h4 className="font-medium text-gray-900">Downloading Update</h4>
            </div>
            <div>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${downloadProgress.percent}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-600">
                <span>{Math.round(downloadProgress.percent)}% complete</span>
                <span>{Math.round(downloadProgress.bytesPerSecond / 1024)} KB/s</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {Math.round(downloadProgress.transferred / 1024 / 1024)} MB of{' '}
                {Math.round(downloadProgress.total / 1024 / 1024)} MB
              </p>
            </div>
          </div>
        )}

        {updateState === 'downloaded' && (
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <RefreshCw className="text-green-500" size={20} />
              <h4 className="font-medium text-gray-900">Update Ready</h4>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-3">
                The update has been downloaded. Restart the application to apply the update.
              </p>
              <div className="space-y-2">
                <button
                  onClick={handleRestartAndUpdate}
                  className="w-full bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
                >
                  Restart & Update
                </button>
                <button
                  onClick={handleDismiss}
                  className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-2 rounded text-sm font-medium transition-colors"
                >
                  Later
                </button>
              </div>
            </div>
          </div>
        )}

        {updateState === 'error' && (
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <AlertCircle className="text-red-500" size={20} />
              <h4 className="font-medium text-gray-900">Update Error</h4>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-3">
                {error || 'An error occurred while checking for updates.'}
              </p>
              <button
                onClick={handleCheckForUpdates}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default UpdateNotification
