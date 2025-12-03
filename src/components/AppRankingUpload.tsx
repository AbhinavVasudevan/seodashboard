'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CloudArrowUpIcon, DocumentTextIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'

interface AppRankingUploadProps {
  appId: string
  appName?: string
  brandName?: string
}

export default function AppRankingUpload({ appId, appName, brandName }: AppRankingUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.csv') && !selectedFile.name.endsWith('.txt')) {
        setError('Please upload a CSV or TXT file')
        return
      }
      setFile(selectedFile)
      setError('')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    if (!file) {
      setError('Please select a file to upload')
      setIsLoading(false)
      return
    }

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('appId', appId)

      const response = await fetch('/api/app-rankings/upload', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to upload rankings')
      }

      toast.success(result.message || 'Rankings uploaded successfully')
      setFile(null)

      const fileInput = document.getElementById('csv-file') as HTMLInputElement
      if (fileInput) {
        fileInput.value = ''
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Upload Keyword Rankings</CardTitle>
        </CardHeader>
        <CardContent>
          {appName && brandName && (
            <div className="mb-6 p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                Uploading rankings for: <span className="font-semibold text-foreground">{appName}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                Brand: <span className="font-semibold text-foreground">{brandName}</span>
              </p>
            </div>
          )}

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="csv-file">CSV File *</Label>
              <div className="flex justify-center px-6 pt-5 pb-6 border-2 border-dashed border-border rounded-lg hover:border-muted-foreground/50 transition-colors">
                <div className="space-y-1 text-center">
                  {file ? (
                    <div className="flex items-center justify-center gap-2">
                      <DocumentTextIcon className="h-10 w-10 text-green-600" />
                      <div className="text-left">
                        <p className="text-sm font-medium">{file.name}</p>
                        <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(2)} KB</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <CloudArrowUpIcon className="mx-auto h-12 w-12 text-muted-foreground" />
                      <div className="flex text-sm text-muted-foreground">
                        <label htmlFor="csv-file" className="relative cursor-pointer rounded-md font-medium text-primary hover:text-primary/80">
                          <span>Upload a file</span>
                          <input
                            id="csv-file"
                            name="csv-file"
                            type="file"
                            className="sr-only"
                            accept=".csv,.txt"
                            onChange={handleFileChange}
                            disabled={isLoading}
                          />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                      <p className="text-xs text-muted-foreground">CSV or TXT up to 10MB</p>
                    </>
                  )}
                </div>
              </div>
            </div>

            <Alert className="border-blue-200 bg-blue-50">
              <AlertDescription>
                <h4 className="text-sm font-medium text-blue-900 mb-2">Supported Formats:</h4>
                <div className="text-xs text-blue-700 space-y-2">
                  <div>
                    <p className="font-medium">CSV Format:</p>
                    <code className="bg-blue-100 px-1 rounded">Keyword, Country, Rank, Score, Traffic</code>
                  </div>
                  <div>
                    <p className="font-medium">Example Data:</p>
                    <div className="bg-white p-2 rounded text-gray-700 font-mono text-xs">
                      betting, GB, 0, 61, 1274<br/>
                      betting apps, GB, 192, 45, 264
                    </div>
                  </div>
                </div>
              </AlertDescription>
            </Alert>

            <div className="flex gap-4">
              <Button type="submit" disabled={isLoading || !file}>
                {isLoading ? 'Uploading...' : 'Upload Rankings'}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
