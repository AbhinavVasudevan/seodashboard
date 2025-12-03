'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'

interface KeywordFormProps {
  brandId: string
  brandName?: string
}

const countries = [
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'IE', name: 'Ireland' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'IT', name: 'Italy' },
  { code: 'ES', name: 'Spain' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'SE', name: 'Sweden' },
  { code: 'NO', name: 'Norway' },
  { code: 'FI', name: 'Finland' },
  { code: 'DK', name: 'Denmark' },
  { code: 'IN', name: 'India' },
  { code: 'JP', name: 'Japan' },
  { code: 'SG', name: 'Singapore' },
  { code: 'MY', name: 'Malaysia' },
]

export default function KeywordForm({ brandId, brandName }: KeywordFormProps) {
  const [keywords, setKeywords] = useState('')
  const [country, setCountry] = useState('US')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const keywordList = keywords
        .split('\n')
        .map(k => k.trim())
        .filter(k => k.length > 0)

      if (keywordList.length === 0) {
        throw new Error('Please enter at least one keyword')
      }

      const promises = keywordList.map(keyword =>
        fetch('/api/keywords', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            keyword,
            country: country.toUpperCase(),
            brandId,
          }),
        })
      )

      const responses = await Promise.all(promises)
      const hasError = responses.some(response => !response.ok)
      if (hasError) {
        throw new Error('Some keywords failed to be created')
      }

      toast.success(`${keywordList.length} keywords added successfully`)
      router.push(`/brands/${brandId}`)
      router.refresh()
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
          <CardTitle>Add Organic SEO Keywords</CardTitle>
        </CardHeader>
        <CardContent>
          {brandName && (
            <Alert className="mb-6 border-blue-200 bg-blue-50">
              <AlertDescription>
                <p className="font-medium text-blue-900">Organic Website SEO Tracking</p>
                <p className="text-blue-700">
                  Adding keywords for: <span className="font-semibold">{brandName}</span>
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  These keywords will track your website&apos;s organic search rankings.
                </p>
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="keywords">Organic Keywords *</Label>
              <Textarea
                id="keywords"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                rows={8}
                placeholder={`Example:\nbest online casino\ncasino bonuses\nonline slots\nlive casino games`}
                required
              />
              <p className="text-sm text-muted-foreground">
                Enter one keyword per line.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Country *</Label>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger>
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((c) => (
                    <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={isLoading || !keywords.trim()}>
                {isLoading ? 'Adding Keywords...' : 'Add Organic Keywords'}
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
