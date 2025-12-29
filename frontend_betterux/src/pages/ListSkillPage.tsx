import React, { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  UploadIcon,
  XIcon,
  Image as ImageIcon,
  CheckCircleIcon,
  AlertCircleIcon,
} from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card } from '../components/ui/Card'
import { apiClient } from '../lib/api'

export function ListSkillPage() {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    level: 'Beginner',
    duration: '',
    location: '',
    isOnline: true,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
    // Clear error when user types
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = {
          ...prev,
        }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const handleToggleOnline = (isOnline: boolean) => {
    setFormData((prev) => ({
      ...prev,
      isOnline,
    }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      handleFile(file)
    }
  }

  const handleFile = (file: File) => {
    // Check if file is an image
    if (!file.type.startsWith('image/')) {
      setErrors((prev) => ({
        ...prev,
        image: 'Please upload an image file',
      }))
      return
    }
    // Create preview URL
    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result as string)
      // Clear image error
      if (errors.image) {
        setErrors((prev) => {
          const newErrors = {
            ...prev,
          }
          delete newErrors.image
          return newErrors
        })
      }
    }
    reader.readAsDataURL(file)
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // Validation
    const newErrors: Record<string, string> = {}
    if (!formData.title.trim()) newErrors.title = 'Title is required'
    if (!formData.description.trim())
      newErrors.description = 'Description is required'
    if (!formData.category) newErrors.category = 'Category is required'
    if (!formData.duration.trim()) newErrors.duration = 'Duration is required'
    if (!formData.isOnline && !formData.location.trim())
      newErrors.location = 'Location is required for in-person skills'
    if (!imagePreview) newErrors.image = 'Please upload a cover image'
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      // Scroll to top to see errors
      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      })
      return
    }
    
    setIsLoading(true)
    setErrors({})
    
    try {
      // Map category name to category ID (based on backend expectations)
      const categoryMap: { [key: string]: number } = {
        'Technology': 1,
        'Creative Arts': 2,
        'Languages': 3,
        'Business & Finance': 4,
        'Health & Fitness': 5,
        'Cooking & Food': 6,
        'Music': 7,
        'Sports & Recreation': 8,
        'Academic': 9,
        'Life Skills': 10
      }
      
      // Transform form data to match API format
      const skillData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        categoryId: categoryMap[formData.category] || 1,
        mode: formData.isOnline ? 'online' : 'in-person',
        duration: Math.max(15, Math.min(480, parseInt(formData.duration.replace(/\D/g, '')) || 60)), // Extract numbers, constrain between 15-480 minutes
        // Note: image upload would need separate handling
      }
      
      // Call the actual API
      const response = await apiClient.createSkill(skillData)
      
      if (response.error) {
        throw new Error(response.error)
      }
      
      // Success - navigate to skills page with success state
      navigate('/skills', { 
        state: { skillCreated: true } 
      })
    } catch (error) {
      console.error('Error creating skill:', error)
      setErrors({
        submit: error instanceof Error ? error.message : 'Failed to create skill. Please try again.'
      })
      // Scroll to top to see the error
      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">List New Skill</h1>
            <p className="text-gray-600 text-sm">
              Share your expertise with the community
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => navigate(-1)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? 'Publishing...' : 'Publish Skill'}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Submit Error */}
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-red-700">
                <AlertCircleIcon className="w-5 h-5" />
                <span className="font-medium">Error creating skill:</span>
              </div>
              <p className="text-red-600 text-sm mt-1">{errors.submit}</p>
            </div>
          )}
          
          {/* Basic Info */}
          <Card padding="lg">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Basic Information
            </h2>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="title"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Skill Title <span className="text-red-500">*</span>
                </label>
                <Input
                  id="title"
                  name="title"
                  placeholder="e.g. Advanced React Patterns"
                  value={formData.title}
                  onChange={handleInputChange}
                  error={errors.title}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="category"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white ${errors.category ? 'border-red-500' : 'border-gray-300'}`}
                  >
                    <option value="">Select a category</option>
                    <option value="Technology">Technology</option>
                    <option value="Creative Arts">Creative Arts</option>
                    <option value="Languages">Languages</option>
                    <option value="Business & Finance">Business & Finance</option>
                    <option value="Health & Fitness">Health & Fitness</option>
                    <option value="Cooking & Food">Cooking & Food</option>
                    <option value="Music">Music</option>
                    <option value="Sports & Recreation">Sports & Recreation</option>
                    <option value="Academic">Academic</option>
                    <option value="Life Skills">Life Skills</option>
                  </select>
                  {errors.category && (
                    <p className="mt-1 text-sm text-red-500">
                      {errors.category}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="level"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Difficulty Level
                  </label>
                  <select
                    id="level"
                    name="level"
                    value={formData.level}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                    <option value="All Levels">All Levels</option>
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="description"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={4}
                  placeholder="Describe what students will learn..."
                  value={formData.description}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${errors.description ? 'border-red-500' : 'border-gray-300'}`}
                />
                {errors.description && (
                  <p className="mt-1 text-sm text-red-500">
                    {errors.description}
                  </p>
                )}
                <p className="mt-1 text-xs text-gray-500 text-right">
                  {formData.description.length}/500 characters
                </p>
              </div>
            </div>
          </Card>

          {/* Media */}
          <Card padding="lg">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Cover Image
            </h2>

            <div
              className={`
                relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200
                ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'}
                ${errors.image ? 'border-red-300 bg-red-50' : ''}
              `}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />

              {imagePreview ? (
                <div className="relative group">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-64 object-cover rounded-lg shadow-sm"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setImagePreview(null)
                        if (fileInputRef.current)
                          fileInputRef.current.value = ''
                      }}
                    >
                      Change Image
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  className="py-8"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ImageIcon className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-1">
                    Click to upload or drag and drop
                  </h3>
                  <p className="text-gray-500 text-sm mb-4">
                    SVG, PNG, JPG or GIF (max. 800x400px)
                  </p>
                  <Button type="button" variant="secondary" size="sm">
                    Select File
                  </Button>
                </div>
              )}
            </div>
            {errors.image && (
              <div className="flex items-center gap-2 mt-2 text-red-500 text-sm">
                <AlertCircleIcon className="w-4 h-4" />
                <span>{errors.image}</span>
              </div>
            )}
          </Card>

          {/* Logistics */}
          <Card padding="lg">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Logistics
            </h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Location Type
                </label>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => handleToggleOnline(true)}
                    className={`
                      flex-1 py-3 px-4 rounded-lg border-2 text-center transition-all
                      ${formData.isOnline ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium' : 'border-gray-200 hover:border-gray-300 text-gray-600'}
                    `}
                  >
                    Online / Remote
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleOnline(false)}
                    className={`
                      flex-1 py-3 px-4 rounded-lg border-2 text-center transition-all
                      ${!formData.isOnline ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium' : 'border-gray-200 hover:border-gray-300 text-gray-600'}
                    `}
                  >
                    In-Person
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="duration"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Duration <span className="text-red-500">*</span>
                  </label>
                  <Input
                    id="duration"
                    name="duration"
                    placeholder="e.g. 4 weeks, 10 sessions"
                    value={formData.duration}
                    onChange={handleInputChange}
                    error={errors.duration}
                  />
                </div>

                {!formData.isOnline && (
                  <div>
                    <label
                      htmlFor="location"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Location <span className="text-red-500">*</span>
                    </label>
                    <Input
                      id="location"
                      name="location"
                      placeholder="e.g. San Francisco, CA"
                      value={formData.location}
                      onChange={handleInputChange}
                      error={errors.location}
                    />
                  </div>
                )}
              </div>
            </div>
          </Card>
        </form>
      </main>
    </div>
  )
}