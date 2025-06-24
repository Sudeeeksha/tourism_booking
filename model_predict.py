import pandas as pd
import pickle
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import classification_report

# Load the dataset
data = pd.read_csv('tourism_peak_time_dataset.csv')

# Prepare the data
def prepare_data(data):
    # Drop unwanted columns
    data = data.drop(columns=['Year', 'Month'], errors='ignore')  # Ensure no error if columns don't exist
    # Create label encoders for categorical variables
    label_encoders = {}
    categorical_columns = ['Location', 'Event', 'Weather']

    # Convert categorical variables to numeric
    df = data.copy()
    for column in categorical_columns:
        label_encoders[column] = LabelEncoder()
        df[column] = label_encoders[column].fit_transform(df[column])

    # Convert Weekend to numeric
    df['Weekend'] = df['Weekend'].map({'Yes': 1, 'No': 0})

    # Convert PeakTime to numeric
    df['PeakTime'] = df['PeakTime'].map({'Yes': 1, 'No': 0})

    return df, label_encoders

df, label_encoders = prepare_data(data)

# Select only the four features for training
selected_features = ['Location', 'Event', 'Weather', 'Weekend']

# Separate features and target
X = df[selected_features]
y = df['PeakTime']

# Split the data into training and test sets
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Train the model
model = RandomForestClassifier(n_estimators=100, random_state=42)
model.fit(X_train, y_train)

# Evaluate the model
y_pred = model.predict(X_test)
print(classification_report(y_test, y_pred))

# Save the model to 'model.pkl'
with open('model.pkl', 'wb') as model_file:
    pickle.dump(model, model_file)

# Save the label encoders to 'label_encoders.pkl'
with open('label_encoders.pkl', 'wb') as encoders_file:
    pickle.dump(label_encoders, encoders_file)

# Reload the model for verification
model = pickle.load(open('model.pkl', 'rb'))
print("Model reloaded successfully.")
