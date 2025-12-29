import React from 'react';
import { Link } from 'react-router-dom';
import { GraduationCapIcon, TwitterIcon, LinkedinIcon, GithubIcon, InstagramIcon } from 'lucide-react';
const footerLinks = {
  Platform: [{
    label: 'Browse Skills',
    href: '/skills'
  }, {
    label: 'How It Works',
    href: '#how-it-works'
  }, {
    label: 'Pricing',
    href: '#pricing'
  }, {
    label: 'Mobile App',
    href: '#mobile'
  }],
  Company: [{
    label: 'About Us',
    href: '#about'
  }, {
    label: 'Careers',
    href: '#careers'
  }, {
    label: 'Blog',
    href: '#blog'
  }, {
    label: 'Contact',
    href: '#contact'
  }],
  Legal: [{
    label: 'Privacy Policy',
    href: '#privacy'
  }, {
    label: 'Terms of Service',
    href: '#terms'
  }, {
    label: 'Cookie Policy',
    href: '#cookies'
  }, {
    label: 'Guidelines',
    href: '#guidelines'
  }]
};
const socialLinks = [{
  icon: <TwitterIcon className="w-5 h-5" />,
  href: '#twitter',
  label: 'Twitter'
}, {
  icon: <LinkedinIcon className="w-5 h-5" />,
  href: '#linkedin',
  label: 'LinkedIn'
}, {
  icon: <GithubIcon className="w-5 h-5" />,
  href: '#github',
  label: 'GitHub'
}, {
  icon: <InstagramIcon className="w-5 h-5" />,
  href: '#instagram',
  label: 'Instagram'
}];
export function Footer() {
  return <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          {/* Brand */}
          <div className="col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <GraduationCapIcon className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">SkillSwap</span>
            </Link>
            <p className="text-sm text-gray-400 mb-6 max-w-xs">
              Connect with passionate learners and teachers in your community.
              Exchange skills, grow together.
            </p>
            <div className="flex gap-4">
              {socialLinks.map(social => <a key={social.label} href={social.href} className="text-gray-400 hover:text-white transition-colors" aria-label={social.label}>
                  {social.icon}
                </a>)}
            </div>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([title, links]) => <div key={title}>
              <h3 className="text-sm font-semibold text-white mb-4">{title}</h3>
              <ul className="space-y-3">
                {links.map(link => <li key={link.label}>
                    <a href={link.href} className="text-sm text-gray-400 hover:text-white transition-colors">
                      {link.label}
                    </a>
                  </li>)}
              </ul>
            </div>)}
        </div>

        <div className="mt-12 pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-gray-500">
            © 2024 SkillSwap. All rights reserved.
          </p>
          <div className="flex gap-6">
            <a href="#privacy" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">
              Privacy
            </a>
            <a href="#terms" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">
              Terms
            </a>
            <a href="#cookies" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">
              Cookies
            </a>
          </div>
        </div>
      </div>
    </footer>;
}