import numpy as np
from .model import encode_skills

def get_recommendations(user_skills, all_skills, user_exchanges, feedback=None):
    # Enhanced collaborative filtering with feedback
    user_vector = encode_skills(user_skills)
    skill_vectors = encode_skills(all_skills)
    
    similarities = np.dot(skill_vectors, user_vector.T) / (np.linalg.norm(skill_vectors, axis=1) * np.linalg.norm(user_vector))
    
    # Adjust based on feedback (simple weighting)
    if feedback:
        for i, skill in enumerate(all_skills):
            if skill in feedback.get('liked', []):
                similarities[i] *= 1.2
            if skill in feedback.get('disliked', []):
                similarities[i] *= 0.8
    
    top_indices = np.argsort(similarities)[-5:][::-1]
    
    recommended_skills = [all_skills[i] for i in top_indices]
    recommended_users = []  # Could implement user-user similarity
    learning_path = generate_learning_path(user_skills, recommended_skills)
    
    return {
        'recommended_skills': recommended_skills,
        'recommended_users': recommended_users,
        'learning_path': learning_path
    }

def generate_learning_path(current_skills, recommended_skills):
    # Simple learning path generation
    path = ['Foundation Skills']
    if len(current_skills) > 2:
        path.append('Intermediate Topics')
    path.extend(recommended_skills[:3])
    path.append('Advanced Mastery')
    return path