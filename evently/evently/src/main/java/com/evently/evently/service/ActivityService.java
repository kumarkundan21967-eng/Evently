package com.evently.evently.service;

import com.evently.evently.model.Activity;
import com.evently.evently.repository.ActivityRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class ActivityService {

    private final ActivityRepository activityRepository;

    public ActivityService(ActivityRepository activityRepository) {
        this.activityRepository = activityRepository;
    }

    public void logActivity(
            String activityType,
            String title,
            String description,
            String username
    ) {
        Activity activity = new Activity();

        activity.setActivityType(activityType);
        activity.setTitle(title);
        activity.setDescription(description);
        activity.setUsername(username);
        activity.setCreatedAt(LocalDateTime.now().toString());

        activityRepository.save(activity);
    }
}
