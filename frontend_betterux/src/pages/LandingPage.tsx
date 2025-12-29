import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRightIcon, UsersIcon, MessageSquareIcon, CalendarIcon, VideoIcon, StarIcon, SmartphoneIcon, CheckIcon } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';
import { Button } from '../components/ui/Button';
import { Avatar } from '../components/ui/Avatar';
import { AnimatedTestimonials } from '../components/ui/animated-testimonials';
import { Particles } from '../components/ui/particles';

const features = [{
  icon: <UsersIcon className="w-6 h-6" />,
  title: 'Skill Exchange',
  description: 'Trade your expertise with others. Teach what you know, learn what you need.',
  color: 'bg-blue-100 text-blue-600'
}, {
  icon: <MessageSquareIcon className="w-6 h-6" />,
  title: 'Real-time Chat',
  description: 'Communicate instantly with your learning partners through our messaging system.',
  color: 'bg-purple-100 text-purple-600'
}, {
  icon: <CalendarIcon className="w-6 h-6" />,
  title: 'Calendar Integration',
  description: 'Schedule sessions seamlessly with our integrated calendar and reminders.',
  color: 'bg-emerald-100 text-emerald-600'
}, {
  icon: <VideoIcon className="w-6 h-6" />,
  title: 'Video Calls',
  description: 'Conduct live learning sessions with built-in video calling and screen sharing.',
  color: 'bg-amber-100 text-amber-600'
}, {
  icon: <StarIcon className="w-6 h-6" />,
  title: 'Reputation System',
  description: 'Build trust through reviews, ratings, and showcase your expertise.',
  color: 'bg-pink-100 text-pink-600'
}, {
  icon: <SmartphoneIcon className="w-6 h-6" />,
  title: 'Mobile App',
  description: 'Learn on the go with our native mobile apps for iOS and Android devices.',
  color: 'bg-cyan-100 text-cyan-600'
}];

const steps = [{
  number: '1',
  title: 'Browse Skills',
  description: 'Explore thousands of skills from passionate teachers in your community.',
  color: 'bg-blue-500'
}, {
  number: '2',
  title: 'Connect',
  description: 'Send exchange requests to teachers and schedule your learning sessions.',
  color: 'bg-purple-500'
}, {
  number: '3',
  title: 'Learn & Grow',
  description: 'Attend sessions, practice new skills, and track your learning journey.',
  color: 'bg-emerald-500'
}];

const stats = [{
  value: '10,000+',
  label: 'Active Learners'
}, {
  value: '5,000+',
  label: 'Skills Listed'
}, {
  value: '50,000+',
  label: 'Exchanges'
}, {
  value: '4.9/5',
  label: 'Avg Rating'
}];

const testimonials = [{
  name: 'Sarah Johnson',
  image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face',
  description: 'SkillSwap helped me learn JavaScript while teaching design. The exchange model is brilliant and the community is incredibly supportive.',
  handle: '@sarah_design'
}, {
  name: 'Mike Chen',
  image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
  description: "I've taught guitar to dozens of students and learned photography in return. The platform makes scheduling and communication so easy.",
  handle: '@mike_music'
}, {
  name: 'Emma Davis',
  image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face',
  description: "The video call feature is seamless. I've been able to teach Python to learners worldwide while picking up new skills myself.",
  handle: '@emma_code'
}, {
  name: 'David Rodriguez',
  image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
  description: "Amazing platform! I taught Spanish and learned digital marketing. The skill exchange concept is revolutionary.",
  handle: '@david_spanish'
}, {
  name: 'Lisa Wang',
  image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop&crop=face',
  description: "The community here is so supportive. I've grown so much both as a teacher and learner. Highly recommend SkillSwap!",
  handle: '@lisa_learns'
}];

export function LandingPage() {
  return <div className="min-h-screen bg-white font-mono">
    <Header />

    {/* Hero Section */}
    <section className="pt-32 pb-20 px-4 relative min-h-[600px] flex items-center">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&h=500&fit=crop')"
        }}
      />
      
      {/* Particles */}
      {/* <Particles
        color="#ffffff"
        particleCount={500}
        particleSize={2}
        animate={true}
        className="z-10"
      /> */}
      
      {/* Overlay for better text readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/50 z-20" />
      
      <div className="relative z-30 max-w-7xl mx-auto text-center">
        <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 drop-shadow-2xl font-mono">
          Learn a Skill.
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 drop-shadow-2xl">
            Teach a Skill.
          </span>
        </h1>
        <p className="text-xl text-white max-w-2xl mx-auto mb-10 drop-shadow-lg font-mono">
          Connect with passionate learners and teachers in your community.
          Exchange skills, grow together, and build meaningful connections
          through peer-to-peer learning.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
          <Link to="/register">
            <Button variant="gradient" size="lg" className="font-mono">
              Get Started Free
              <ArrowRightIcon className="w-5 h-5 ml-2" />
            </Button>
          </Link>
          <Link to="/skills">
            <Button variant="secondary" size="lg" className="bg-white/20 backdrop-blur-sm text-white border-white/30 hover:bg-white/30 font-mono">
              Browse Skills
            </Button>
          </Link>
        </div>
      </div>
    </section>

    {/* Features Section */}
    <section id="features" className="py-20 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 font-mono">
            Everything You Need to Learn & Teach
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto font-mono">
            Powerful features designed to make skill exchange seamless,
            engaging, and rewarding for everyone.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map(feature => <div key={feature.title} className="p-6 rounded-2xl border border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all duration-300 font-mono">
              <div className={`w-12 h-12 ${feature.color} rounded-xl flex items-center justify-center mb-4`}>
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-600">{feature.description}</p>
            </div>)}
        </div>
      </div>
    </section>

    {/* How It Works */}
    <section id="how-it-works" className="py-20 px-4 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 font-mono">
            How SkillSwap Works
          </h2>
          <p className="text-lg text-gray-600 font-mono">
            Get started in three simple steps and begin your learning journey
            today.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, index) => <div key={step.title} className="text-center">
              <div className={`w-16 h-16 ${step.color} rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-6 font-mono`}>
                {step.number}
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2 font-mono">
                {step.title}
              </h3>
              <p className="text-gray-600 font-mono">{step.description}</p>
              {index < steps.length - 1 && <div className="hidden md:block absolute top-8 left-1/2 w-full h-0.5 bg-gray-200" />}
            </div>)}
        </div>
      </div>
    </section>

    {/* Community Stats */}
    <section id="community" className="py-20 px-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white">
      <div className="max-w-7xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-4 font-mono">
          Join Our Growing Community
        </h2>
        <p className="text-lg text-white/80 mb-12 max-w-2xl mx-auto font-mono">
          Thousands of learners and teachers are already exchanging skills and
          growing together.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {stats.map(stat => <div key={stat.label} className="font-mono">
              <div className="text-4xl md:text-5xl font-bold mb-2">
                {stat.value}
              </div>
              <div className="text-white/70">{stat.label}</div>
            </div>)}
        </div>

        <Link to="/register">
          <Button variant="success" size="lg" className="bg-white text-blue-600 hover:bg-gray-100 font-mono">
            Start Learning Today
          </Button>
        </Link>
      </div>
    </section>

    {/* Animated Testimonials */}
    <section className="py-20 px-4 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 font-mono">
            What Our Community Says
          </h2>
          <p className="text-lg text-gray-600 font-mono">
            Real stories from real people who've transformed their skills
            through SkillSwap.
          </p>
        </div>

        <AnimatedTestimonials 
          data={testimonials}
          className="font-mono"
          cardClassName="font-mono"
        />
      </div>
    </section>

    {/* CTA Section */}
    <section className="py-20 px-4">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 font-mono">
          Ready to Start Your Learning Journey?
        </h2>
        <p className="text-lg text-gray-600 mb-8 font-mono">
          Join thousands of learners and teachers who are exchanging skills
          every day. Sign up now and discover your next skill.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link to="/register">
            <Button variant="primary" size="lg" className="font-mono">Create Free Account</Button>
          </Link>
          <Link to="/skills">
            <Button variant="link" size="lg" className="font-mono">
              Learn More
            </Button>
          </Link>
        </div>
      </div>
    </section>

    <Footer />
  </div>;
}