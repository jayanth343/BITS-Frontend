import cv2
import mediapipe as mp
import numpy as np
import time
from flask import Flask, Response
import threading
from flask_cors import CORS

# Initialize MediaPipe Pose
mp_pose = mp.solutions.pose
mp_drawing = mp.solutions.drawing_utils
mp_drawing_styles = mp.solutions.drawing_styles

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Global variable to store the latest frame
global_frame = None

def getAngle(a, b, c):
    """Calculate angle between three points"""
    pA = np.array(a)
    pB = np.array(b)
    pC = np.array(c)
    ab = pB - pA
    bc = pC - pB
    
    # Ensure we don't get NaN due to numerical issues
    dot_product = np.clip(np.dot(ab, bc) / (np.linalg.norm(ab) * np.linalg.norm(bc)), -1.0, 1.0)
    angle = np.arccos(dot_product)
    return np.degrees(angle)

def getPosture(results, img):
    """Calculate head tilt and shoulder tilt"""
    height, width, _ = img.shape
    
    # Extract landmarks
    nose = (int(results.pose_landmarks.landmark[mp_pose.PoseLandmark.NOSE].x * width), 
            int(results.pose_landmarks.landmark[mp_pose.PoseLandmark.NOSE].y * height))
    
    left_shoulder = (int(results.pose_landmarks.landmark[mp_pose.PoseLandmark.LEFT_SHOULDER].x * width), 
                     int(results.pose_landmarks.landmark[mp_pose.PoseLandmark.LEFT_SHOULDER].y * height))
    
    right_shoulder = (int(results.pose_landmarks.landmark[mp_pose.PoseLandmark.RIGHT_SHOULDER].x * width), 
                      int(results.pose_landmarks.landmark[mp_pose.PoseLandmark.RIGHT_SHOULDER].y * height))
    
    # Calculate tilts
    head_tilt = getAngle(left_shoulder, nose, right_shoulder)
    shoulder_tilt = np.abs(left_shoulder[1] - right_shoulder[1])
    
    return head_tilt, shoulder_tilt

def getSpineAngle(results, img):
    """Calculate spine angle"""
    height, width, _ = img.shape
    
    # Extract landmarks
    left_shoulder = (int(results.pose_landmarks.landmark[mp_pose.PoseLandmark.LEFT_SHOULDER].x * width), 
                     int(results.pose_landmarks.landmark[mp_pose.PoseLandmark.LEFT_SHOULDER].y * height))
    
    right_shoulder = (int(results.pose_landmarks.landmark[mp_pose.PoseLandmark.RIGHT_SHOULDER].x * width), 
                      int(results.pose_landmarks.landmark[mp_pose.PoseLandmark.RIGHT_SHOULDER].y * height))
    
    left_hip = (int(results.pose_landmarks.landmark[mp_pose.PoseLandmark.LEFT_HIP].x * width), 
                int(results.pose_landmarks.landmark[mp_pose.PoseLandmark.LEFT_HIP].y * height))
    
    right_hip = (int(results.pose_landmarks.landmark[mp_pose.PoseLandmark.RIGHT_HIP].x * width), 
                 int(results.pose_landmarks.landmark[mp_pose.PoseLandmark.RIGHT_HIP].y * height))
    
    # Calculate midpoints
    shoulder_midpoint = ((left_shoulder[0] + right_shoulder[0]) // 2, 
                         (left_shoulder[1] + right_shoulder[1]) // 2)
    
    hip_midpoint = ((left_hip[0] + right_hip[0]) // 2, 
                    (left_hip[1] + right_hip[1]) // 2)
    
    # Calculate spine angle
    vertical_reference = (shoulder_midpoint[0], shoulder_midpoint[1] - 100)
    spine_angle = getAngle(vertical_reference, shoulder_midpoint, hip_midpoint)
    return 180 - spine_angle

# Define our threshold values
MAX_HEAD_THRESHOLD = 110
MIN_HEAD_THRESHOLD = 90
SHOULDER_THRESHOLD = 20
SPINE_THRESHOLD = 171

# Custom drawing function to highlight connections that exceed thresholds
def draw_landmarks_with_thresholds(image, landmarks, connections, 
                                  landmark_drawing_spec=None, 
                                  connection_drawing_spec=None,
                                  head_tilt=None,
                                  shoulder_tilt=None,
                                  spine_angle=None):
    """Draw landmarks with custom colors based on threshold violations"""
    height, width, _ = image.shape
    
    # Draw landmarks first
    for idx, landmark in enumerate(landmarks.landmark):
        landmark_px = mp_drawing._normalized_to_pixel_coordinates(
            landmark.x, landmark.y, width, height)
        if landmark_px:
            cv2.circle(image, landmark_px, 5, (0, 255, 0), -1)
    
    # Define indices for different body parts
    nose_idx = mp_pose.PoseLandmark.NOSE.value
    left_shoulder_idx = mp_pose.PoseLandmark.LEFT_SHOULDER.value
    right_shoulder_idx = mp_pose.PoseLandmark.RIGHT_SHOULDER.value
    left_hip_idx = mp_pose.PoseLandmark.LEFT_HIP.value
    right_hip_idx = mp_pose.PoseLandmark.RIGHT_HIP.value
    left_ear_idx = mp_pose.PoseLandmark.LEFT_EAR.value
    right_ear_idx = mp_pose.PoseLandmark.RIGHT_EAR.value
    
    # Draw connections with custom colors
    for connection in connections:
        start_idx = connection[0]
        end_idx = connection[1]
        
        # Get pixel coordinates
        start_landmark = landmarks.landmark[start_idx]
        end_landmark = landmarks.landmark[end_idx]
        
        start_point = mp_drawing._normalized_to_pixel_coordinates(
            start_landmark.x, start_landmark.y, width, height)
        end_point = mp_drawing._normalized_to_pixel_coordinates(
            end_landmark.x, end_landmark.y, width, height)
        
        if not (start_point and end_point):
            continue
        
        # Default connection color
        connection_color = (0, 255, 0)  # Green
        
        # Check for head tilt issues (connections involving the head)
        if head_tilt is not None and (head_tilt > MAX_HEAD_THRESHOLD or head_tilt < MIN_HEAD_THRESHOLD):
            if (start_idx in [nose_idx, left_ear_idx, right_ear_idx] or 
                end_idx in [nose_idx, left_ear_idx, right_ear_idx]):
                connection_color = (0, 0, 255)  # Red
        
        # Check for shoulder tilt issues
        if shoulder_tilt is not None and shoulder_tilt > SHOULDER_THRESHOLD:
            if (start_idx == left_shoulder_idx and end_idx == right_shoulder_idx) or \
               (start_idx == right_shoulder_idx and end_idx == left_shoulder_idx):
                connection_color = (0, 0, 255)  # Red
        
        # Check for spine angle issues
        if spine_angle is not None and spine_angle < SPINE_THRESHOLD:
            # Connections between shoulders and hips (spine area)
            if ((start_idx in [left_shoulder_idx, right_shoulder_idx] and 
                 end_idx in [left_hip_idx, right_hip_idx]) or
                (start_idx in [left_hip_idx, right_hip_idx] and 
                 end_idx in [left_shoulder_idx, right_shoulder_idx])):
                connection_color = (0, 0, 255)  # Red
        
        # Draw the connection
        cv2.line(image, start_point, end_point, connection_color, 2)

def generate_frames():
    global global_frame
    while True:
        if global_frame is not None:
            # Encode frame as JPEG
            ret, buffer = cv2.imencode('.jpg', global_frame)
            frame = buffer.tobytes()
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')

@app.route('/video_feed')
def video_feed():
    return Response(generate_frames(),
                    mimetype='multipart/x-mixed-replace; boundary=frame')

def process_video():
    global global_frame
    
    # Initialize webcam
    cap = cv2.VideoCapture(0)
    prev_frame_time = 0  # Add this line to define prev_frame_time
    
    with mp_pose.Pose(
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5,
        model_complexity=1,
        smooth_landmarks=True) as pose:
        
        while cap.isOpened():
            success, image = cap.read()
            if not success:
                print("Failed to read from camera")  # Add debug print
                continue
                
            # Calculate FPS
            current_time = time.time()
            fps = 1/(current_time-prev_frame_time) if prev_frame_time > 0 else 0
            prev_frame_time = current_time
            
            # Flip image for mirror effect before processing
            image = cv2.flip(image, 1)
            
            # Improve performance by marking image as not writeable
            image.flags.writeable = False
            
            # Convert to RGB for MediaPipe
            rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            
            results = pose.process(rgb_image)
            
            # Draw pose landmarks on image
            image.flags.writeable = True
            
            # Convert back to BGR
            image = cv2.cvtColor(rgb_image, cv2.COLOR_RGB2BGR)
            
            if results.pose_landmarks:
                # Calculate posture metrics
                head_tilt, shoulder_tilt = getPosture(results, image)
                spine_angle = getSpineAngle(results, image)
                
                # Draw landmarks with threshold-based coloring
                draw_landmarks_with_thresholds(
                    image,
                    results.pose_landmarks,
                    mp_pose.POSE_CONNECTIONS,
                    head_tilt=head_tilt,
                    shoulder_tilt=shoulder_tilt,
                    spine_angle=spine_angle
                )
                
                # Display metrics with color-coded text
                head_tilt_color = (0, 255, 0) if MIN_HEAD_THRESHOLD <= head_tilt <= MAX_HEAD_THRESHOLD else (0, 0, 255)
                shoulder_tilt_color = (0, 255, 0) if shoulder_tilt <= SHOULDER_THRESHOLD else (0, 0, 255)
                spine_angle_color = (0, 255, 0) if spine_angle >= SPINE_THRESHOLD else (0, 0, 255)
                
                cv2.putText(image, f"Head Tilt: {head_tilt:.1f}", (10, 30), 
                            cv2.FONT_HERSHEY_SIMPLEX, 1.0, head_tilt_color, 2)
                cv2.putText(image, f"Shoulder Tilt: {shoulder_tilt:.1f}", (10, 70), 
                            cv2.FONT_HERSHEY_SIMPLEX, 1.0, shoulder_tilt_color, 2)
                cv2.putText(image, f"Spine Angle: {spine_angle:.1f}", (10, 110), 
                            cv2.FONT_HERSHEY_SIMPLEX, 1.0, spine_angle_color, 2)
                
                # Display thresholds
                cv2.putText(image, f"Head Tilt Thresholds: {MIN_HEAD_THRESHOLD}-{MAX_HEAD_THRESHOLD}", (10, 150), 
                            cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 1)
                cv2.putText(image, f"Shoulder Tilt Threshold: {SHOULDER_THRESHOLD}", (10, 180), 
                            cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 1)
                cv2.putText(image, f"Spine Angle Threshold: {SPINE_THRESHOLD}", (10, 210), 
                            cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 1)
            # Display FPS
            cv2.putText(image, f"FPS: {int(fps)}", (image.shape[1] - 120, 30), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
            
            # Store the processed frame in global variable
            global_frame = image

            # Add small delay to prevent CPU overload
            time.sleep(0.01)

if __name__ == '__main__':
    try:
        # Start video processing in a separate thread
        video_thread = threading.Thread(target=process_video)
        video_thread.daemon = True
        video_thread.start()
        
        print("Starting Flask server on port 8000...")  # Add debug print
        # Run Flask app
        app.run(host='0.0.0.0', port=8000, debug=False)
    except Exception as e:
        print(f"Error starting server: {e}")  # Add error handling
