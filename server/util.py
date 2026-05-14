import numpy as np 
import json
import pickle
import os

__location = None
__data_columns = None 
__model = None

# ✅ Fix: Get the directory where util.py lives
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

def get_estimate_price(location, sqft, bath, bhk):
    try:
        loc_idx = __data_columns.index(location.lower())
    except:
        loc_idx = -1

    x = np.zeros(len(__data_columns))
    x[0] = sqft
    x[1] = bath
    x[2] = bhk

    if loc_idx >= 0:
        x[loc_idx] = 1

    return round(__model.predict([x])[0], 2)


def get_location():
    return __location

def load_saved_artifacts():
    print("Loading Saved Artifacts Start")

    global __data_columns
    global __location
    global __model

    # ✅ Fix: Use BASE_DIR so paths work on any machine/server
    columns_path = os.path.join(BASE_DIR, 'artifacts', 'columns.json')
    model_path = os.path.join(BASE_DIR, 'artifacts', 'House_Price_Prediction_Model.pickle')

    with open(columns_path, 'r') as f:
        __data_columns = json.load(f)['data_columns']
        __location = __data_columns[3:]

    with open(model_path, 'rb') as f1:
        __model = pickle.load(f1)

    print('Loading saved artifacts Done..')

if __name__ == '__main__':
    load_saved_artifacts()
    print(get_location())
    print(get_estimate_price('1st Phase JP Nagar', 1000, 3, 2))
    print(get_estimate_price('1st Phase JP Nagar', 1000, 2, 2))