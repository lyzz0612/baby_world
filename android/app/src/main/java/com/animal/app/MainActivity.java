package com.animal.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;
import com.kcode.lib.UpdateWrapper;
import com.kcode.lib.bean.VersionModel;
import com.kcode.lib.net.CheckUpdateTask;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        checkForUpdate();
    }

    private void checkForUpdate() {
        String updateUrl = getString(R.string.update_check_url);
        new UpdateWrapper.Builder(getApplicationContext())
                .setTime(0)
                .setUrl(updateUrl)
                .setNotificationIcon(R.mipmap.ic_launcher)
                .setIsShowToast(false)
                .setIsShowNetworkErrorToast(false)
                .setIsShowBackgroundDownload(true)
                .setCallback(new CheckUpdateTask.Callback() {
                    @Override
                    public void callBack(VersionModel model, boolean hasNewVersion) {
                        // AppUpdate handles UI; callback is for logging only
                    }
                })
                .build()
                .start();
    }
}
