import pandas as pd
import numpy as np
import pickle
import os
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.model_selection import train_test_split, GridSearchCV
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
from sklearn.preprocessing import StandardScaler
from config import *

def prepare_training_data(match_features_df):
    """准备训练数据"""
    if match_features_df is None or match_features_df.empty:
        print("无效的比赛特征数据")
        return None, None
    
    # 只使用已完成的比赛
    completed_matches = match_features_df[match_features_df['status'] == 'FINISHED'].copy()
    
    if completed_matches.empty:
        print("没有已完成的比赛数据")
        return None, None
    
    # 选择特征列
    feature_cols = [col for col in completed_matches.columns if col.startswith('home_') or col.startswith('away_')]
    feature_cols = [col for col in feature_cols if col not in ['home_team', 'away_team', 'home_score', 'away_score']]
    
    # 准备特征和目标变量
    X = completed_matches[feature_cols].copy()
    y = completed_matches['result'].copy()
    
    # 处理缺失值
    X = X.fillna(0)
    
    # 标准化特征
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    return X_scaled, y, feature_cols, scaler

def train_match_result_model(match_features_df, model_type='rf'):
    """训练比赛结果预测模型"""
    X, y, feature_cols, scaler = prepare_training_data(match_features_df)
    
    if X is None or y is None:
        return None
    
    # 分割训练集和测试集
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # 选择模型
    if model_type == 'rf':
        model = RandomForestClassifier(n_estimators=100, random_state=42)
        param_grid = {
            'n_estimators': [50, 100, 200],
            'max_depth': [None, 10, 20, 30],
            'min_samples_split': [2, 5, 10]
        }
    elif model_type == 'gb':
        model = GradientBoostingClassifier(random_state=42)
        param_grid = {
            'n_estimators': [50, 100, 200],
            'learning_rate': [0.01, 0.1, 0.2],
            'max_depth': [3, 5, 7]
        }
    else:
        print(f"不支持的模型类型: {model_type}")
        return None
    
    # 使用网格搜索找到最佳参数
    print("正在进行网格搜索以找到最佳参数...")
    grid_search = GridSearchCV(model, param_grid, cv=5, scoring='accuracy')
    grid_search.fit(X_train, y_train)
    
    best_model = grid_search.best_estimator_
    print(f"最佳参数: {grid_search.best_params_}")
    
    # 在测试集上评估模型
    y_pred = best_model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    
    print(f"模型准确率: {accuracy:.4f}")
    print("分类报告:")
    print(classification_report(y_test, y_pred))
    print("混淆矩阵:")
    print(confusion_matrix(y_test, y_pred))
    
    # 保存模型
    if not os.path.exists(os.path.dirname(MODEL_SAVE_PATH)):
        os.makedirs(os.path.dirname(MODEL_SAVE_PATH))
    
    with open(MODEL_SAVE_PATH, 'wb') as f:
        pickle.dump({
            'model': best_model,
            'feature_cols': feature_cols,
            'scaler': scaler
        }, f)
    
    print(f"模型已保存至 {MODEL_SAVE_PATH}")
    
    return {
        'model': best_model,
        'feature_cols': feature_cols,
        'scaler': scaler
    }

def load_model():
    """加载保存的模型"""
    try:
        with open(MODEL_SAVE_PATH, 'rb') as f:
            model_data = pickle.load(f)
        print(f"从{MODEL_SAVE_PATH}加载了模型")
        return model_data
    except:
        print(f"无法加载模型，请先训练模型")
        return None

def predict_match(model_data, match_features):
    """预测单场比赛结果"""
    if model_data is None:
        print("无效的模型数据")
        return None
    
    model = model_data['model']
    feature_cols = model_data['feature_cols']
    scaler = model_data['scaler']
    
    # 提取特征
    X = match_features[feature_cols].values.reshape(1, -1)
    
    # 标准化特征
    X_scaled = scaler.transform(X)
    
    # 预测结果概率
    proba = model.predict_proba(X_scaled)[0]
    
    # 获取类别标签
    classes = model.classes_
    